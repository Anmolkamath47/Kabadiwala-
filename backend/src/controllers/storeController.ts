import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/storeService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const PurchaseProductSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  coinsToRedeem: z.number().nonnegative().optional().default(0),
  quantity: z.number().int().positive().optional().default(1),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  shippingAddress: z.object({
    name: z.string().min(1, 'Recipient name is required'),
    phone: z.string().min(8, 'Phone number is required'),
    address: z.string().min(5, 'Delivery address is required'),
  }),
});

export const RecyclerProductListingSchema = z.object({
  productId: z.string().optional(),
  recyclerId: z.string().min(1, 'Recycler ID is required'),
  recyclerName: z.string().min(1, 'Recycler Name is required'),
  recyclerLocation: z
    .object({
      address: z.string().optional(),
      city: z.string().optional(),
      rating: z.number().optional(),
    })
    .optional(),
  name: z.string().min(2, 'Product Name is required'),
  description: z.string().min(5, 'Description is required'),
  category: z.enum([
    'Furniture',
    'Chairs & Tables',
    'Home & Kitchen',
    'Garden Products',
    'Dustbins',
    'Home Decor',
    'Bags & Accessories',
    'Other Recycled Products',
  ]),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  originalPrice: z.number().positive('Original price must be positive'),
  discountedPrice: z.number().positive('Discounted price must be positive'),
  maxRewardCoins: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative('Stock must be 0 or more'),
  specifications: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

export class StoreController {
  /**
   * GET /api/store/recyclers
   * Fetch registered recyclers and what products each recycler is selling and at what price!
   */
  static async getRecyclers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;

      const recyclers = await StoreService.getRecyclersWithProducts({
        category,
        search,
      });

      res.status(200).json({
        success: true,
        data: recyclers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/store/recyclers/:recyclerId
   * Fetch a single recycler profile and their listed products
   */
  static async getRecyclerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recyclerId = req.params.recyclerId as string;
      const recycler = await StoreService.getRecyclerById(recyclerId);

      if (!recycler) {
        res.status(404).json({
          success: false,
          message: `Recycler '${recyclerId}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: recycler,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/store/products
   * Product search, category filters, and optional recyclerId filter
   */
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recyclerId = req.query.recyclerId as string | undefined;
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 12;
      const sortBy = req.query.sortBy as any;

      const result = await StoreService.getProducts({
        recyclerId,
        category,
        search,
        page,
        limit,
        sortBy,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/store/products/:productId
   */
  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const product = await StoreService.getProductById(productId);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Product not found',
      });
    }
  }

  /**
   * POST /api/store/purchase
   * Buy a recycled product using reward coins
   */
  static async purchaseProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const validatedData = PurchaseProductSchema.parse(req.body);

      const purchaseResult = await StoreService.purchaseProduct(consumerId, validatedData);

      res.status(200).json({
        success: true,
        message: 'Order placed successfully! Product will be dispatched shortly.',
        data: purchaseResult,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process product purchase',
      });
    }
  }

  /**
   * GET /api/store/my-orders
   */
  static async getMyStoreOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const consumerId = (req.user!._id as any).toString();
      const orders = await StoreService.getConsumerStoreOrders(consumerId);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/store/products (Internal or Recycler submission)
   */
  static async listRecyclerProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = RecyclerProductListingSchema.parse(req.body);
      const product = await StoreService.listOrUpdateProduct(validatedData as any);

      res.status(201).json({
        success: true,
        message: 'Product listed and approved for marketplace',
        data: product,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to list product',
      });
    }
  }

  /**
   * DELETE /api/store/products/:productId
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const recyclerId = req.query.recyclerId as string || (req as any).dealer?.dealerId;

      if (!recyclerId) {
        res.status(400).json({ success: false, message: 'recyclerId is required' });
        return;
      }

      const deleted = await StoreService.deleteProduct(productId, recyclerId);
      res.status(200).json({
        success: true,
        message: deleted ? 'Product deleted successfully' : 'Product not found',
      });
    } catch (error) {
      next(error);
    }
  }
}
