import mongoose from 'mongoose';
import { RecycledProduct, IRecycledProduct, RECYCLED_CATEGORIES } from '../models/RecycledProduct.js';
import { StoreOrder, IStoreOrder } from '../models/StoreOrder.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { WalletService } from './walletService.js';
import { RecycledCategory } from '../types/index.js';

export interface ProductQueryOptions {
  recyclerId?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'popular' | 'priceAsc' | 'priceDesc' | 'latest';
}

export interface RecyclerWithProducts {
  recyclerId: string;
  recyclerName: string;
  contactPerson?: string;
  phone?: string;
  rating: number;
  totalRatings: number;
  address?: string;
  city?: string;
  location?: any;
  productCount: number;
  products: IRecycledProduct[];
  isVerified: boolean;
}

export class StoreService {
  /**
   * Fetch active recycled products with search, category & recycler filtering
   */
  static async getProducts(options: ProductQueryOptions = {}): Promise<{
    products: IRecycledProduct[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
    categories: RecycledCategory[];
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(50, options.limit || 12));
    const skip = (page - 1) * limit;

    const query: any = {
      isActive: true,
      isApproved: true,
      stock: { $gt: 0 },
    };

    // Filter by specific recycler
    if (options.recyclerId && options.recyclerId.trim() !== '') {
      query.recyclerId = options.recyclerId.trim();
    }

    // Filter by category
    if (options.category && options.category !== 'ALL' && options.category.trim() !== '') {
      query.category = options.category.trim();
    }

    // Filter by search query (name, description, recycler name)
    if (options.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { recyclerName: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    // Sorting
    let sortQuery: any = { createdAt: -1 };
    if (options.sortBy === 'priceAsc') {
      sortQuery = { discountedPrice: 1 };
    } else if (options.sortBy === 'priceDesc') {
      sortQuery = { discountedPrice: -1 };
    } else if (options.sortBy === 'popular') {
      sortQuery = { stock: -1, maxRewardCoins: -1 };
    }

    const [products, total] = await Promise.all([
      RecycledProduct.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
      RecycledProduct.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      products: products as any,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      categories: [...RECYCLED_CATEGORIES],
    };
  }

  /**
   * Fetch registered recyclers and their listed products.
   * Consumers can clearly see which recycler is selling what and at what price!
   */
  static async getRecyclersWithProducts(options: {
    category?: string;
    search?: string;
  } = {}): Promise<RecyclerWithProducts[]> {
    // 1. Fetch active real recycled products
    const productQuery: any = {
      isActive: true,
      isApproved: true,
      stock: { $gt: 0 },
    };

    if (options.category && options.category !== 'ALL' && options.category.trim() !== '') {
      productQuery.category = options.category.trim();
    }

    if (options.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      productQuery.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { recyclerName: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    const activeProducts = await RecycledProduct.find(productQuery).sort({ createdAt: -1 }).lean();

    // Group active products by recyclerId
    const productsByRecycler = new Map<string, any[]>();
    const recyclerInfoFromProducts = new Map<string, any>();

    for (const prod of activeProducts) {
      const rId = prod.recyclerId;
      if (!productsByRecycler.has(rId)) {
        productsByRecycler.set(rId, []);
        recyclerInfoFromProducts.set(rId, {
          recyclerId: rId,
          recyclerName: prod.recyclerName,
          address: prod.recyclerLocation?.address || 'Service Hub',
          city: prod.recyclerLocation?.city || 'Delhi NCR',
          rating: prod.recyclerLocation?.rating || 4.8,
        });
      }
      productsByRecycler.get(rId)!.push(prod);
    }

    // 2. Fetch registered partner recyclers / dealers from DealerSnapshot
    const DUMMY_DEALER_IDS = new Set(['DLR-BLR-001', 'DLR-RAMESH-001', 'DLR-SURESH-002', 'DLR-530794']);
    const registeredDealers = await DealerSnapshot.find({}).lean();

    const recyclerMap = new Map<string, RecyclerWithProducts>();

    // Add registered dealers from DealerSnapshot
    for (const dealer of registeredDealers) {
      if (DUMMY_DEALER_IDS.has(dealer.dealerId)) continue;

      const prods = productsByRecycler.get(dealer.dealerId) || [];
      recyclerMap.set(dealer.dealerId, {
        recyclerId: dealer.dealerId,
        recyclerName: dealer.businessName || 'Certified Recycler Partner',
        contactPerson: dealer.contactPerson,
        phone: dealer.phone,
        rating: dealer.rating || 4.9,
        totalRatings: dealer.totalRatings || 18,
        address: dealer.address || (dealer.location as any)?.address || 'Service Hub',
        city: 'Delhi NCR',
        location: dealer.location,
        productCount: prods.length,
        products: prods,
        isVerified: true,
      });
    }

    // Also include any recyclers that exist in products but not yet in DealerSnapshot
    for (const [rId, info] of recyclerInfoFromProducts.entries()) {
      if (!recyclerMap.has(rId)) {
        const prods = productsByRecycler.get(rId) || [];
        recyclerMap.set(rId, {
          recyclerId: rId,
          recyclerName: info.recyclerName || 'Certified Recycler Partner',
          rating: info.rating || 4.8,
          totalRatings: 14,
          address: info.address || 'Service Hub',
          city: info.city || 'Delhi NCR',
          productCount: prods.length,
          products: prods,
          isVerified: true,
        });
      }
    }

    // Convert map to array and sort:
    // Recyclers with active products come first, then sorted by rating
    const recyclersList = Array.from(recyclerMap.values()).sort((a, b) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount;
      }
      return b.rating - a.rating;
    });

    return recyclersList;
  }

  /**
   * Get single recycler profile and all their active listed products
   */
  static async getRecyclerById(recyclerId: string): Promise<RecyclerWithProducts | null> {
    const recyclers = await this.getRecyclersWithProducts();
    const found = recyclers.find((r) => r.recyclerId === recyclerId);
    if (!found) {
      const dealer = await DealerSnapshot.findOne({ dealerId: recyclerId }).lean();
      if (!dealer) return null;
      const prods = await RecycledProduct.find({
        recyclerId,
        isActive: true,
        isApproved: true,
        stock: { $gt: 0 },
      }).lean();

      return {
        recyclerId: dealer.dealerId,
        recyclerName: dealer.businessName,
        contactPerson: dealer.contactPerson,
        phone: dealer.phone,
        rating: dealer.rating || 4.9,
        totalRatings: dealer.totalRatings || 18,
        address: dealer.address || 'Service Hub',
        city: 'Delhi NCR',
        location: dealer.location,
        productCount: prods.length,
        products: prods as any,
        isVerified: true,
      };
    }
    return found;
  }

  /**
   * Get single product details by productId
   */
  static async getProductById(productId: string): Promise<IRecycledProduct> {
    const product = await RecycledProduct.findOne({
      $or: [{ productId }, { _id: mongoose.isValidObjectId(productId) ? productId : null }],
      isActive: true,
    });

    if (!product) {
      throw new Error(`Recycled product '${productId}' not found or is currently unavailable.`);
    }

    return product;
  }

  /**
   * Recycler lists a new recycled product or updates an existing listing.
   * Immediately approved & active so it becomes visible to all consumers.
   */
  static async listOrUpdateProduct(data: {
    productId?: string;
    recyclerId: string;
    recyclerName: string;
    recyclerLocation?: {
      address?: string;
      city?: string;
      rating?: number;
    };
    name: string;
    description: string;
    category: RecycledCategory;
    images: string[];
    originalPrice: number;
    discountedPrice: number;
    maxRewardCoins?: number;
    stock: number;
    specifications?: Array<{ key: string; value: string }>;
  }): Promise<IRecycledProduct> {
    const productId =
      data.productId || `REC-PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const maxRewardCoins =
      data.maxRewardCoins !== undefined
        ? data.maxRewardCoins
        : Math.min(Math.floor(data.discountedPrice * 0.25), 200);

    const product = await RecycledProduct.findOneAndUpdate(
      { productId },
      {
        productId,
        recyclerId: data.recyclerId,
        recyclerName: data.recyclerName,
        recyclerLocation: data.recyclerLocation || { city: 'Delhi NCR', rating: 4.8 },
        name: data.name,
        description: data.description,
        category: data.category,
        images: data.images,
        originalPrice: data.originalPrice,
        discountedPrice: data.discountedPrice,
        maxRewardCoins,
        stock: Math.max(0, data.stock),
        specifications: data.specifications || [],
        isActive: true,
        isApproved: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return product;
  }

  /**
   * Recycler deletes their product listing
   */
  static async deleteProduct(productId: string, recyclerId: string): Promise<boolean> {
    const result = await RecycledProduct.deleteOne({ productId, recyclerId });
    return result.deletedCount > 0;
  }

  /**
   * Purchase a recycled product using optional reward coins and supported payment method
   */
  static async purchaseProduct(
    consumerId: string,
    purchaseData: {
      productId: string;
      coinsToRedeem?: number;
      quantity?: number;
      paymentMethod: string;
      shippingAddress: {
        name: string;
        phone: string;
        address: string;
      };
    }
  ): Promise<{
    order: IStoreOrder;
    coinsRedeemed: number;
    discountAmount: number;
    finalPricePaid: number;
    remainingCoins: number;
  }> {
    const quantity = Math.max(1, purchaseData.quantity || 1);

    // 1. Fetch product and verify stock
    const product = await RecycledProduct.findOne({
      $or: [{ productId: purchaseData.productId }, { _id: mongoose.isValidObjectId(purchaseData.productId) ? purchaseData.productId : null }],
      isActive: true,
    });

    if (!product) {
      throw new Error('Product not found or unavailable');
    }

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Only ${product.stock} item(s) available.`);
    }

    const unitPrice = product.discountedPrice;
    const totalOriginalAmount = unitPrice * quantity;

    // 2. Validate and calculate coin redemption
    const maxCoinsAllowed = Math.min(product.maxRewardCoins * quantity, totalOriginalAmount);
    const requestedCoins = Math.max(0, Math.floor(purchaseData.coinsToRedeem || 0));
    const validatedCoins = Math.min(requestedCoins, maxCoinsAllowed);

    const orderId = `ORD-STORE-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let remainingCoins = 0;

    // 3. If coins are being redeemed, atomically deduct from wallet
    if (validatedCoins > 0) {
      const redemptionResult = await WalletService.redeemCoins(
        consumerId,
        orderId,
        validatedCoins,
        `Redeemed ${validatedCoins} coins for recycled product: ${product.name}`,
        {
          orderId,
          productId: product.productId,
          productName: product.name,
          unitPrice,
          quantity,
        }
      );
      remainingCoins = redemptionResult.wallet.availableCoins;
    } else {
      const wallet = await WalletService.getOrCreateWallet(consumerId);
      remainingCoins = wallet.availableCoins;
    }

    const coinDiscountAmount = validatedCoins; // 1 coin = ₹1 discount
    const finalPayableAmount = Math.max(0, totalOriginalAmount - coinDiscountAmount);

    // 4. Atomically decrement stock
    await RecycledProduct.findOneAndUpdate(
      { productId: product.productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } }
    );

    // 5. Create store order record
    const storeOrder = await StoreOrder.create({
      orderId,
      consumerId: new mongoose.Types.ObjectId(consumerId),
      productId: product.productId,
      productSnapshot: {
        productId: product.productId,
        name: product.name,
        category: product.category,
        image: product.images[0] || '',
        recyclerName: product.recyclerName,
        originalPrice: product.originalPrice,
        discountedPrice: product.discountedPrice,
      },
      quantity,
      unitPrice,
      coinsRedeemed: validatedCoins,
      coinDiscountAmount,
      finalPayableAmount,
      paymentMethod: purchaseData.paymentMethod || 'Cash on Delivery',
      shippingAddress: purchaseData.shippingAddress,
      status: 'PLACED',
    });

    return {
      order: storeOrder,
      coinsRedeemed: validatedCoins,
      discountAmount: coinDiscountAmount,
      finalPricePaid: finalPayableAmount,
      remainingCoins,
    };
  }

  /**
   * Get store purchase history for consumer
   */
  static async getConsumerStoreOrders(consumerId: string): Promise<IStoreOrder[]> {
    return StoreOrder.find({ consumerId: new mongoose.Types.ObjectId(consumerId) })
      .sort({ createdAt: -1 })
      .lean() as any;
  }
}
