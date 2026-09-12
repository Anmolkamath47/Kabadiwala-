import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  orderId: string;
  consumerId: mongoose.Types.ObjectId;
  dealerId: string;
  score: number;
  feedback?: string;
  tags: string[];
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>(
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
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Rating = mongoose.model<IRating>('Rating', RatingSchema);
