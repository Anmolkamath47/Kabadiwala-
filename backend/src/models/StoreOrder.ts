import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreOrder extends Document {
  orderId: string;
  consumerId: mongoose.Types.ObjectId;
  productId: string;
  productSnapshot: {
    productId: string;
    name: string;
    category: string;
    image: string;
    recyclerName: string;
    originalPrice: number;
    discountedPrice: number;
  };
  quantity: number;
  unitPrice: number;
  coinsRedeemed: number;
  coinDiscountAmount: number;
  finalPayableAmount: number;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
  };
  status: 'PLACED' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const StoreOrderSchema = new Schema<IStoreOrder>(
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
    productId: {
      type: String,
      required: true,
      index: true,
    },
    productSnapshot: {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      category: { type: String, required: true },
      image: { type: String, required: true },
      recyclerName: { type: String, required: true },
      originalPrice: { type: Number, required: true },
      discountedPrice: { type: Number, required: true },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    coinsRedeemed: {
      type: Number,
      required: true,
      default: 0,
    },
    coinDiscountAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    finalPayableAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'Cash on Delivery',
    },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
    },
  },
  {
    timestamps: true,
  }
);

StoreOrderSchema.index({ consumerId: 1, createdAt: -1 });

export const StoreOrder = mongoose.model<IStoreOrder>('StoreOrder', StoreOrderSchema);
