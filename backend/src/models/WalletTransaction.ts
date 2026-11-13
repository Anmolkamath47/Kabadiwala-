import mongoose, { Document, Schema } from 'mongoose';
import { WalletTransactionType, WalletTransactionSource } from '../types/index.js';

export interface IWalletTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: WalletTransactionType;
  source: WalletTransactionSource;
  referenceId: string;
  coins: number;
  balanceAfter: number;
  dealAmount?: number;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['EARNED', 'REDEEMED'],
      required: true,
    },
    source: {
      type: String,
      enum: ['SCRAP_TRANSACTION', 'PRODUCT_PURCHASE', 'REFUND', 'ADMIN'],
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    coins: {
      type: Number,
      required: true,
      min: 1,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    dealAmount: {
      type: Number,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique compound index preventing duplicate reward or redemption processing for the same reference
WalletTransactionSchema.index({ referenceId: 1, type: 1, source: 1 }, { unique: true });
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema
);
