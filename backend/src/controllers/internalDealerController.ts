import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/orderService.js';
import { DealerGatewayService } from '../services/dealerGatewayService.js';

export const DealerStatusTransitionSchema = z.object({
  orderId: z.string(),
  dealerId: z.string(),
  status: z.enum([
    'ACCEPTED',
    'DEALER_EN_ROUTE',
    'ARRIVED',
    'OTP_PENDING',
    'COMPLETED',
    'REJECTED',
  ]),
  note: z.string().optional(),
  finalWeights: z
    .array(
      z.object({
        category: z.string(),
        name: z.string(),
        unit: z.enum(['kg', 'piece']).default('kg'),
        pricePerKg: z.number(),
        actualWeightKg: z.number().positive(),
        finalAmount: z.number().positive(),
      })
    )
    .optional(),
  finalTotalAmount: z.number().optional(),
  dealerLocation: z
    .object({
      coordinates: z.tuple([z.number(), z.number()]),
      heading: z.number().optional(),
      speed: z.number().optional(),
      etaMinutes: z.number().optional(),
      distanceKm: z.number().optional(),
      updatedAt: z.any().optional(),
    })
    .optional(),
});

export const DealerLocationUpdateSchema = z.object({
  orderId: z.string().optional(),
  dealerId: z.string(),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export const DealerOtpVerifySchema = z.object({
  orderId: z.string(),
  dealerId: z.string(),
  otp: z.string().length(4, 'OTP must be 4 digits'),
});

export class InternalDealerController {
  /**
   * Dealer transitions order status (e.g. ACCEPTED, DEALER_EN_ROUTE, ARRIVED, COMPLETED, REJECTED)
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, status, note, finalWeights, finalTotalAmount, dealerLocation } = req.body;

      const order = await OrderService.transitionStatus(orderId, status, {
        updatedBy: 'DEALER',
        note,
        finalWeights,
        finalTotalAmount,
        dealerLocation,
      });

      res.status(200).json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update order status',
      });
    }
  }

  /**
   * Dealer pushes live GPS location
   */
  static async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, dealerId, coordinates, heading, speed } = req.body;

      // Also update dealer snapshot location
      await DealerGatewayService.updateDealerLocation(dealerId, coordinates[0], coordinates[1]);

      if (orderId) {
        const order = await OrderService.updateDealerLiveLocation(
          orderId,
          coordinates,
          heading,
          speed
        );
        res.status(200).json({
          success: true,
          message: 'Live location updated for order',
          data: order.dealerLiveLocation,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Dealer location updated',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update location',
      });
    }
  }

  /**
   * Dealer submits OTP verification for pickup
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, otp } = req.body;
      const order = await OrderService.verifyPickupOtp(orderId, otp);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Scrap collection can begin.',
        data: {
          orderId: order.orderId,
          status: order.status,
          isVerified: order.otp.isVerified,
          verifiedAt: order.otp.verifiedAt,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'OTP verification failed',
      });
    }
  }
}
