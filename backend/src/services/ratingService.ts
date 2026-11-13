import mongoose from 'mongoose';
import { Rating, IRating } from '../models/Rating.js';
import { Order } from '../models/Order.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { DealerGatewayService } from './dealerGatewayService.js';

export class RatingService {
  /**
   * Submit rating for a completed order
   */
  static async rateOrder(
    consumerId: string,
    orderId: string,
    score: number,
    feedback?: string,
    tags: string[] = []
  ): Promise<IRating> {
    if (score < 1 || score > 5) {
      throw new Error('Rating score must be between 1 and 5.');
    }

    const order = await Order.findOne({
      orderId,
      consumerId: new mongoose.Types.ObjectId(consumerId),
    });

    if (!order) {
      throw new Error('Order not found or you are not authorized to rate this order.');
    }

    if (order.status !== 'COMPLETED') {
      throw new Error('You can only rate a completed scrap pickup order.');
    }

    if (order.rated) {
      throw new Error('This order has already been rated.');
    }

    // 1. Create rating record
    const rating = await Rating.create({
      orderId,
      consumerId: new mongoose.Types.ObjectId(consumerId),
      dealerId: order.dealerId,
      score,
      feedback: feedback?.trim(),
      tags,
    });

    // 2. Mark order as rated
    order.rated = true;
    await order.save();

    // 3. Synchronize rating with Kabadidealer Partner Backend
    await DealerGatewayService.submitDealerRating(order.dealerId, {
      orderId,
      score,
      feedback,
      tags,
    });

    // 4. Update local DealerSnapshot if available
    try {
      const allRatings = await Rating.find({ dealerId: order.dealerId });
      const totalRatings = allRatings.length;
      const avgScore =
        allRatings.reduce((acc, curr) => acc + curr.score, 0) / (totalRatings || 1);

      await DealerSnapshot.findOneAndUpdate(
        { dealerId: order.dealerId },
        {
          rating: Math.round(avgScore * 10) / 10,
          totalRatings,
        }
      );
    } catch (err) {
      console.warn('Failed to update dealer average rating aggregate:', err);
    }

    return rating;
  }

  /**
   * Get rating for a specific order
   */
  static async getOrderRating(orderId: string): Promise<IRating | null> {
    return (await Rating.findOne({ orderId }).lean()) as unknown as IRating | null;
  }
}
