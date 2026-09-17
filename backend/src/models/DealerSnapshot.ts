import mongoose, { Document, Schema } from 'mongoose';
import { ScrapRateItem } from '../types/index.js';

export interface IDealerSnapshot extends Document {
  dealerId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  profileImage?: string;
  rating: number;
  totalRatings: number;
  completedPickups?: number;
  isAvailable: boolean;
  activeRadiusKm: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address: string;
  vehicleType: string;
  vehicleNumber?: string;
  scrapRates: ScrapRateItem[];
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapRateItemSchema = new Schema<ScrapRateItem>(
  {
    category: {
      type: String,
      required: true,
      enum: ['Paper', 'Plastic', 'Metal', 'Aluminium', 'Copper', 'Brass', 'E-Waste', 'Cardboard', 'Glass', 'Other'],
    },
    name: { type: String, required: true },
    unit: { type: String, enum: ['kg', 'piece'], default: 'kg' },
    pricePerKg: { type: Number, required: true },
    minQuantityKg: { type: Number, default: 1 },
    icon: { type: String },
  },
  { _id: false }
);

const DealerSnapshotSchema = new Schema<IDealerSnapshot>(
  {
    dealerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    profileImage: { type: String, default: '' },
    rating: { type: Number, default: 4.8, min: 1, max: 5 },
    totalRatings: { type: Number, default: 24 },
    completedPickups: { type: Number, default: 24 },
    isAvailable: { type: Boolean, default: true, index: true },
    activeRadiusKm: { type: Number, default: 10 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    address: { type: String, required: true },
    vehicleType: { type: String, default: 'Electric Scrap Loader' },
    vehicleNumber: { type: String, default: 'DL-01-AB-1234' },
    scrapRates: [ScrapRateItemSchema],
    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

DealerSnapshotSchema.index({ location: '2dsphere' });

export const DealerSnapshot = mongoose.model<IDealerSnapshot>('DealerSnapshot', DealerSnapshotSchema);
