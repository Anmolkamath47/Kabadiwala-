import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/orderService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const CreateOrderSchema = z.object({
  dealerId: z.string().min(1, 'Dealer ID is required'),
  pickupAddress: z.string().min(5, 'Pickup address is required'),
  pickupCoordinates: z.tuple([z.number(), z.number()]),
  selectedMaterials: z
    .array(
      z.object({
        category: z.string(),
        name: z.string(),
        unit: z.enum(['kg', 'piece']).default('kg'),
        estimatedWeightKg: z.number().positive('Weight must be greater than 0'),
      })
    )
    .min(1, 'At least one scrap item must be selected'),
  scrapPhoto: z.string().optional(),
  notes: z.string().optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().optional(),
});

export class OrderController {
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const order = await OrderService.createOrder(consumerId, req.body);

      res.status(201).json({
        success: true,
        message: 'Scrap pickup order placed successfully. Waiting for dealer to accept.',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order',
      });
    }
  }

  static async getConsumerOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await OrderService.getConsumerOrders(consumerId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const consumerId = (req.user!._id as any).toString();

      const order = await OrderService.getOrderByOrderId(orderId, consumerId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const consumerId = (req.user!._id as any).toString();
      const { reason } = req.body;

      // Verify ownership
      const existing = await OrderService.getOrderByOrderId(orderId, consumerId);
      if (!existing) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      const updatedOrder = await OrderService.transitionStatus(orderId, 'CANCELLED', {
        updatedBy: 'CONSUMER',
        note: reason || 'Cancelled by consumer',
        cancellationReason: reason,
      });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: updatedOrder,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel order',
      });
    }
  }

  static async getOrderChat(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const messages = await OrderService.getOrderChatMessages(orderId);
      res.status(200).json({ success: true, data: messages });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async postOrderChat(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { text, senderName } = req.body;
      if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: 'Message text is required' });
        return;
      }
      const message = await OrderService.addOrderChatMessage(
        orderId,
        'consumer',
        senderName || (req as any).user?.name || 'Customer',
        text
      );
      res.status(201).json({ success: true, data: message });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
