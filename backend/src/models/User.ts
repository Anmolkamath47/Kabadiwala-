import mongoose, { Document, Schema } from 'mongoose';
import { SavedAddress } from '../types/index.js';

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
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ 'currentLocation.coordinates': '2dsphere' });

export const User = mongoose.model<IUser>('User', UserSchema);
