import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { WalletService } from '../services/walletService.js';

export class WalletController {
  /**
   * Get user wallet summary & recent transaction history
   */
  static async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const typeFilter = req.query.type as 'EARNED' | 'REDEEMED' | undefined;

      const dashboard = await WalletService.getWalletDashboard(consumerId, page, limit, typeFilter);

      res.status(200).json({
        success: true,
        data: {
          wallet: {
            availableCoins: dashboard.wallet.availableCoins,
            lifetimeEarned: dashboard.wallet.lifetimeEarned,
            lifetimeRedeemed: dashboard.wallet.lifetimeRedeemed,
            updatedAt: dashboard.wallet.updatedAt,
          },
          transactions: dashboard.transactions,
          pagination: dashboard.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated transaction history
   */
  static async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const typeFilter = req.query.type as 'EARNED' | 'REDEEMED' | undefined;

      const dashboard = await WalletService.getWalletDashboard(consumerId, page, limit, typeFilter);

      res.status(200).json({
        success: true,
        data: {
          transactions: dashboard.transactions,
          pagination: dashboard.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
