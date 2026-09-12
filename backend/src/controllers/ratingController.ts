import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { RatingService } from '../services/ratingService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const CreateRatingSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export class RatingController {
  static async rateOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const { orderId, score, feedback, tags } = req.body;

      const rating = await RatingService.rateOrder(
        consumerId,
        orderId,
        score,
        feedback,
        tags || []
      );

      res.status(201).json({
        success: true,
        message: 'Thank you! Your rating and feedback have been recorded.',
        data: rating,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit rating',
      });
    }
  }

  static async getOrderRating(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const rating = await RatingService.getOrderRating(orderId);

      if (!rating) {
        res.status(404).json({
          success: false,
          message: 'No rating found for this order',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: rating,
      });
    } catch (error) {
      next(error);
    }
  }
}
