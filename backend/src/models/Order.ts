import mongoose, { Document, Schema } from 'mongoose';
import {
  OrderStatus,
  SelectedMaterialItem,
  FinalWeightItem,
  StatusHistoryEntry,
  ScrapRateItem,
  DealerLiveLocationUpdate,
} from '../types/index.js';

export interface IOrderChatMessage {
  id: string;
  sender: 'consumer' | 'dealer';
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface IOrder extends Document {
  orderId: string;
  consumerId: mongoose.Types.ObjectId;
  dealerId: string;
  dealerSnapshot: {
    businessName: string;
    contactPerson: string;
    phone: string;
    vehicleType?: string;
    vehicleNumber?: string;
    profileImage?: string;
    rating?: number;
    totalRatings?: number;
    completedPickups?: number;
  };
  pickupAddress: string;
  pickupLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  selectedMaterials: SelectedMaterialItem[];
  dealerPricesSnapshot: ScrapRateItem[];
  estimatedTotalAmount: number;
  finalWeights?: FinalWeightItem[];
  finalTotalAmount?: number;
  scrapPhoto?: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  otp: {
    code: string;
    expiresAt: Date;
    verifiedAt?: Date;
    isVerified: boolean;
  };
  dealerLiveLocation?: DealerLiveLocationUpdate;
  cancellationReason?: string;
  cancelledBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
  rated: boolean;
  chatMessages: IOrderChatMessage[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SelectedMaterialSchema = new Schema<SelectedMaterialItem>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    pricePerKg: { type: Number, required: true },
    estimatedWeightKg: { type: Number, required: true },
    calculatedAmount: { type: Number, required: true },
  },
  { _id: false }
);

const FinalWeightSchema = new Schema<FinalWeightItem>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    pricePerKg: { type: Number, required: true },
    actualWeightKg: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'PENDING',
        'ACCEPTED',
        'DEALER_EN_ROUTE',
        'ARRIVED',
        'OTP_PENDING',
        'OTP_VERIFIED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
      ],
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    updatedBy: { type: String, enum: ['CONSUMER', 'DEALER', 'SYSTEM'], default: 'SYSTEM' },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    consumerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dealerId: {
      type: String,
      required: true,
      index: true,
    },
    dealerSnapshot: {
      businessName: { type: String, required: true },
      contactPerson: { type: String, required: true },
      phone: { type: String, required: true },
      vehicleType: { type: String, default: 'Electric Scrap Auto' },
      vehicleNumber: { type: String, default: 'DL-01-AB-1234' },
      profileImage: { type: String, default: '' },
      rating: { type: Number, default: 4.8 },
      totalRatings: { type: Number, default: 24 },
      completedPickups: { type: Number, default: 24 },
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    pickupLocation: {
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
    selectedMaterials: [SelectedMaterialSchema],
    dealerPricesSnapshot: [Schema.Types.Mixed],
    estimatedTotalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    finalWeights: [FinalWeightSchema],
    finalTotalAmount: {
      type: Number,
    },
    scrapPhoto: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'DEALER_EN_ROUTE',
        'ARRIVED',
        'OTP_PENDING',
        'OTP_VERIFIED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
      ],
      default: 'PENDING',
      index: true,
    },
    statusHistory: [StatusHistorySchema],
    otp: {
      code: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      verifiedAt: { type: Date },
      isVerified: { type: Boolean, default: false },
    },
    dealerLiveLocation: {
      coordinates: { type: [Number] },
      heading: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      updatedAt: { type: Date },
      etaMinutes: { type: Number },
      distanceKm: { type: Number },
    },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ['CONSUMER', 'DEALER', 'SYSTEM'] },
    rated: { type: Boolean, default: false },
    chatMessages: [
      {
        id: { type: String, required: true },
        sender: { type: String, enum: ['consumer', 'dealer'], required: true },
        senderName: { type: String, default: '' },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ pickupLocation: '2dsphere' });
OrderSchema.index({ consumerId: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
