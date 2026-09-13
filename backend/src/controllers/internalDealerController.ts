import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/orderService.js';
import { DealerGatewayService } from '../services/dealerGatewayService.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { socketEvents } from '../sockets/socketManager.js';

export const DealerPresenceSchema = z.object({
  dealerId: z.string(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  contactPerson: z.string().optional(),
  isOnline: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional(),
  rating: z.number().optional(),
  totalRatings: z.number().optional(),
  location: z.any().optional(),
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  scrapRates: z.array(z.any()).optional(),
  activeRadiusKm: z.number().optional(),
});

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

  /**
   * Dealer presence update (online/offline status, location, profile changes)
   */
  static async updateDealerPresence(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const {
        dealerId,
        phone,
        businessName,
        contactPerson,
        isOnline,
        isAvailable,
        rating,
        totalRatings,
        location,
        vehicleType,
        vehicleNumber,
        scrapRates,
        activeRadiusKm,
      } = req.body;

      const onlineStatus = isOnline !== undefined ? Boolean(isOnline) : true;
      const availabilityStatus = isAvailable !== undefined ? Boolean(isAvailable) : onlineStatus;

      const updateData: any = {
        isAvailable: availabilityStatus,
        lastActiveAt: new Date(),
      };

      if (phone) updateData.phone = phone;
      if (businessName) updateData.businessName = businessName;
      if (contactPerson) updateData.contactPerson = contactPerson;
      if (rating !== undefined) updateData.rating = rating;
      if (totalRatings !== undefined) updateData.totalRatings = totalRatings;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
      if (scrapRates) updateData.scrapRates = scrapRates;
      if (activeRadiusKm) updateData.activeRadiusKm = activeRadiusKm;

      if (location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        updateData.location = {
          type: 'Point',
          coordinates: location.coordinates,
        };
        if (location.address) {
          updateData.address = location.address;
        }
      }

      const updatedSnapshot = await DealerSnapshot.findOneAndUpdate(
        { dealerId },
        {
          $set: updateData,
          $setOnInsert: {
            dealerId,
            phone: phone || '+91 98765 43210',
            businessName: businessName || 'Partner Scrap Dealer',
            contactPerson: contactPerson || 'Partner Dealer',
            rating: rating || 4.9,
            totalRatings: totalRatings || 142,
            location: {
              type: 'Point',
              coordinates: location?.coordinates || [77.2150, 28.6250],
            },
            address: location?.address || 'Pickup Service Area',
            vehicleType: vehicleType || 'Electric Scrap Loader',
            vehicleNumber: vehicleNumber || 'DL-01-EV-9821',
            activeRadiusKm: activeRadiusKm || 15,
            scrapRates: scrapRates || [],
          },
        },
        { upsert: true, new: true }
      );

      // Real-time broadcast to all consumer WebSocket listeners
      socketEvents.emitDealerStatusUpdate(dealerId, onlineStatus, {
        dealer: updatedSnapshot,
        location: updatedSnapshot.location,
        isOnline: onlineStatus,
        isAvailable: availabilityStatus,
      });

      res.status(200).json({
        success: true,
        message: `Dealer presence synchronized: ${onlineStatus ? 'ONLINE' : 'OFFLINE'}`,
        data: {
          dealerId,
          isOnline: onlineStatus,
          isAvailable: availabilityStatus,
          dealer: updatedSnapshot,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update dealer presence',
      });
    }
  }
}
