import mongoose from 'mongoose';
import { Wallet, IWallet } from '../models/Wallet.js';
import { WalletTransaction, IWalletTransaction } from '../models/WalletTransaction.js';
import { socketEvents } from '../sockets/socketManager.js';

export class WalletService {
  /**
   * Calculate reward coins based on final deal amount.
   * Formula: rewardCoins = floor(finalDealAmount * 0.10)
   * Examples:
   * ₹100 -> 10 coins
   * ₹250 -> 25 coins
   * ₹500 -> 50 coins
   * ₹1,000 -> 100 coins
   */
  static calculateScrapRewardCoins(finalDealAmount: number): number {
    if (!finalDealAmount || finalDealAmount <= 0) {
      return 0;
    }
    return Math.floor(finalDealAmount * 0.10);
  }

  /**
   * Get or create wallet for consumer
   */
  static async getOrCreateWallet(userId: string): Promise<IWallet> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let wallet = await Wallet.findOne({ userId: userObjectId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: userObjectId,
        availableCoins: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      });
    }

    return wallet;
  }

  /**
   * Credit reward coins to consumer upon successful scrap deal completion.
   * Atomic, strictly idempotent, duplicate-safe.
   */
  static async creditScrapReward(
    consumerId: string,
    orderId: string,
    finalDealAmount: number
  ): Promise<{ wallet: IWallet; rewardCoins: number; alreadyCredited: boolean }> {
    const userObjectId = new mongoose.Types.ObjectId(consumerId);
    const rewardCoins = this.calculateScrapRewardCoins(finalDealAmount);

    if (rewardCoins <= 0) {
      const wallet = await this.getOrCreateWallet(consumerId);
      return { wallet, rewardCoins: 0, alreadyCredited: false };
    }

    // 1. Check idempotency: check if already credited for this order
    const existingTx = await WalletTransaction.findOne({
      referenceId: orderId,
      type: 'EARNED',
      source: 'SCRAP_TRANSACTION',
    });

    if (existingTx) {
      const wallet = await this.getOrCreateWallet(consumerId);
      return { wallet, rewardCoins: existingTx.coins, alreadyCredited: true };
    }

    // 2. Perform atomic increment on Wallet
    const wallet = await Wallet.findOneAndUpdate(
      { userId: userObjectId },
      {
        $inc: {
          availableCoins: rewardCoins,
          lifetimeEarned: rewardCoins,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // 3. Create transaction record with unique compound index protection
    try {
      await WalletTransaction.create({
        walletId: wallet._id,
        userId: userObjectId,
        type: 'EARNED',
        source: 'SCRAP_TRANSACTION',
        referenceId: orderId,
        coins: rewardCoins,
        balanceAfter: wallet.availableCoins,
        dealAmount: finalDealAmount,
        description: `Reward earned from scrap deal #${orderId} (₹${finalDealAmount})`,
        metadata: {
          orderId,
          dealAmount: finalDealAmount,
          rewardPercentage: 10,
        },
      });
    } catch (err: any) {
      // In the rare race condition where duplicate key is hit on referenceId, roll back the increment
      if (err.code === 11000) {
        console.warn(`⚠️ Duplicate reward attempt blocked by unique index for order ${orderId}`);
        const rolledBackWallet = await Wallet.findOneAndUpdate(
          { userId: userObjectId },
          {
            $inc: {
              availableCoins: -rewardCoins,
              lifetimeEarned: -rewardCoins,
            },
          },
          { new: true }
        );
        return { wallet: rolledBackWallet || wallet, rewardCoins, alreadyCredited: true };
      }
      throw err;
    }

    // 4. Notify consumer via real-time WebSocket
    socketEvents.emitWalletUpdate(consumerId, {
      availableCoins: wallet.availableCoins,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeRedeemed: wallet.lifetimeRedeemed,
      rewardCoinsCredited: rewardCoins,
      orderId,
    });

    return { wallet, rewardCoins, alreadyCredited: false };
  }

  /**
   * Redeem reward coins for product purchase.
   * Atomic check and debit from wallet.
   */
  static async redeemCoins(
    consumerId: string,
    referenceId: string,
    coinsToRedeem: number,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<{ wallet: IWallet; transaction: IWalletTransaction }> {
    if (coinsToRedeem <= 0) {
      throw new Error('Coins to redeem must be greater than 0');
    }

    const userObjectId = new mongoose.Types.ObjectId(consumerId);

    // 1. Atomic check and debit: only succeeds if availableCoins >= coinsToRedeem
    const wallet = await Wallet.findOneAndUpdate(
      {
        userId: userObjectId,
        availableCoins: { $gte: coinsToRedeem },
      },
      {
        $inc: {
          availableCoins: -coinsToRedeem,
          lifetimeRedeemed: coinsToRedeem,
        },
      },
      {
        new: true,
      }
    );

    if (!wallet) {
      // Check current balance to provide helpful error
      const current = await Wallet.findOne({ userId: userObjectId });
      const available = current ? current.availableCoins : 0;
      throw new Error(
        `Insufficient reward coins in wallet. You requested ${coinsToRedeem} coins, but only have ${available} available.`
      );
    }

    // 2. Create transaction record
    const transaction = await WalletTransaction.create({
      walletId: wallet._id,
      userId: userObjectId,
      type: 'REDEEMED',
      source: 'PRODUCT_PURCHASE',
      referenceId,
      coins: coinsToRedeem,
      balanceAfter: wallet.availableCoins,
      description,
      metadata,
    });

    // 3. Emit real-time socket event
    socketEvents.emitWalletUpdate(consumerId, {
      availableCoins: wallet.availableCoins,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeRedeemed: wallet.lifetimeRedeemed,
      coinsRedeemed: coinsToRedeem,
      referenceId,
    });

    return { wallet, transaction };
  }

  /**
   * Get wallet summary along with recent transaction history
   */
  static async getWalletDashboard(
    consumerId: string,
    page: number = 1,
    limit: number = 20,
    typeFilter?: 'EARNED' | 'REDEEMED'
  ): Promise<{
    wallet: IWallet;
    transactions: IWalletTransaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const wallet = await this.getOrCreateWallet(consumerId);
    const userObjectId = new mongoose.Types.ObjectId(consumerId);

    const query: any = { userId: userObjectId };
    if (typeFilter && ['EARNED', 'REDEEMED'].includes(typeFilter)) {
      query.type = typeFilter;
    }

    const total = await WalletTransaction.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (Math.max(1, page) - 1) * limit;

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      wallet,
      transactions: transactions as any,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
