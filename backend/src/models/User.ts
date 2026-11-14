import mongoose, { Document, Schema } from 'mongoose';
import { SavedAddress } from '../types/index.js';

export type TrustTier = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'RESTRICTED';

export interface IUserCancellationRecord {
  orderId: string;
  cancelledAt: Date;
  orderStatusAtCancellation: string;
  reason?: string;
}

export interface IUser extends Document {
  phone: string;
  name?: string;
  profileImage?: string;
  email?: string;
  isProfileCompleted?: boolean;
  savedLocations: SavedAddress[];
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
  isActive: boolean;
  refreshTokenHash?: string;
  // User Reliability & Rating System
  trustScore: number;
  starRating: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
  recentCancellations: IUserCancellationRecord[];
  bookingCooldownUntil?: Date | null;
  trustTier: TrustTier;
  dealerRatingsCount: number;
  dealerRatingsTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

const SavedAddressSchema = new Schema<SavedAddress>(
  {
    label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    address: { type: String, required: true },
    landmark: { type: String },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (val: number[]) => val.length === 2,
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'Scrap Seller',
    },
    profileImage: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    savedLocations: [SavedAddressSchema],
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [77.2090, 28.6139], // Default: New Delhi coordinates
      },
      address: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
    },
    // User Reliability & Rating System
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    starRating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    completedOrders: {
      type: Number,
      default: 0,
    },
    cancelledOrders: {
      type: Number,
      default: 0,
    },
    cancellationRate: {
      type: Number,
      default: 0,
    },
    recentCancellations: [
      {
        orderId: { type: String, required: true },
        cancelledAt: { type: Date, default: Date.now },
        orderStatusAtCancellation: { type: String, default: 'PENDING' },
        reason: { type: String, default: '' },
      },
    ],
    bookingCooldownUntil: {
      type: Date,
      default: null,
    },
    trustTier: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'WARNING', 'RESTRICTED'],
      default: 'EXCELLENT',
    },
    dealerRatingsCount: {
      type: Number,
      default: 0,
    },
    dealerRatingsTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ 'currentLocation.coordinates': '2dsphere' });

export const User = mongoose.model<IUser>('User', UserSchema);
