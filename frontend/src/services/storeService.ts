import api from './api';
import { RecycledProduct, RecycledCategory, StoreOrder, RecyclerProfile } from '../types';

export interface ProductsResponse {
  products: RecycledProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  categories: RecycledCategory[];
}

export interface PurchasePayload {
  productId: string;
  coinsToRedeem: number;
  quantity?: number;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface PurchaseResponse {
  order: StoreOrder;
  coinsRedeemed: number;
  discountAmount: number;
  finalPricePaid: number;
  remainingCoins: number;
}

export const storeService = {
  /**
   * Fetch registered recyclers and their listed products.
   * Allows consumers to see which recycler is selling what and at what price!
   */
  async getRecyclers(params?: {
    category?: string;
    search?: string;
  }): Promise<RecyclerProfile[]> {
    const res = await api.get('/store/recyclers', { params });
    return res.data.data || [];
  },

  /**
   * Get single recycler profile and all their listed products
   */
  async getRecyclerById(recyclerId: string): Promise<RecyclerProfile> {
    const res = await api.get(`/store/recyclers/${recyclerId}`);
    return res.data.data;
  },

  /**
   * Fetch active recycled products with search, category filtering & optional recycler filter
   */
  async getProducts(params?: {
    recyclerId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'popular' | 'priceAsc' | 'priceDesc' | 'latest';
  }): Promise<ProductsResponse> {
    const res = await api.get('/store/products', { params });
    return res.data.data;
  },

  /**
   * Get single product details
   */
  async getProductById(productId: string): Promise<RecycledProduct> {
    const res = await api.get(`/store/products/${productId}`);
    return res.data.data;
  },

  /**
   * Purchase a recycled product using reward coins
   */
  async purchaseProduct(data: PurchasePayload): Promise<PurchaseResponse> {
    const res = await api.post('/store/purchase', data);
    return res.data.data;
  },

  /**
   * Get consumer store orders
   */
  async getMyStoreOrders(): Promise<StoreOrder[]> {
    const res = await api.get('/store/my-orders');
    return res.data.data;
  },
};
