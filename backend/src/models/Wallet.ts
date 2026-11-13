import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  availableCoins: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    availableCoins: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lifetimeRedeemed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
