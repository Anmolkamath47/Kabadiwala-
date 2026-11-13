import mongoose, { Document, Schema } from 'mongoose';
import { RecycledCategory } from '../types/index.js';

export const RECYCLED_CATEGORIES: RecycledCategory[] = [
  'Furniture',
  'Chairs & Tables',
  'Home & Kitchen',
  'Garden Products',
  'Dustbins',
  'Home Decor',
  'Bags & Accessories',
  'Other Recycled Products',
];

export interface IRecycledProduct extends Document {
  productId: string;
  recyclerId: string;
  recyclerName: string;
  recyclerLocation?: {
    address?: string;
    city?: string;
    rating?: number;
  };
  name: string;
  description: string;
  category: RecycledCategory;
  images: string[];
  originalPrice: number;
  discountedPrice: number;
  maxRewardCoins: number;
  stock: number;
  specifications: Array<{ key: string; value: string }>;
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecycledProductSchema = new Schema<IRecycledProduct>(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recyclerId: {
      type: String,
      required: true,
      index: true,
    },
    recyclerName: {
      type: String,
      required: true,
      trim: true,
    },
    recyclerLocation: {
      address: { type: String },
      city: { type: String, default: 'Delhi NCR' },
      rating: { type: Number, default: 4.8 },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: RECYCLED_CATEGORIES,
      index: true,
    },
    images: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length > 0, 'At least one product image is required'],
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxRewardCoins: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

RecycledProductSchema.index({ category: 1, isActive: 1, stock: 1 });
RecycledProductSchema.index({ name: 'text', description: 'text', recyclerName: 'text' });

export const RecycledProduct = mongoose.model<IRecycledProduct>(
  'RecycledProduct',
  RecycledProductSchema
);
