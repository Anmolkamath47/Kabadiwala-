export type ScrapCategory =
  | 'Paper'
  | 'Plastic'
  | 'Metal'
  | 'Aluminium'
  | 'Copper'
  | 'Brass'
  | 'E-Waste'
  | 'Cardboard'
  | 'Glass'
  | 'Other';

export interface ScrapRateItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  minQuantityKg?: number;
  icon?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DEALER_EN_ROUTE'
  | 'ARRIVED'
  | 'OTP_PENDING'
  | 'OTP_VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface SavedAddress {
  _id?: string;
  label: 'Home' | 'Work' | 'Other';
  address: string;
  landmark?: string;
  coordinates: [number, number]; // [lng, lat]
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  profileImage?: string;
  email?: string;
  isProfileCompleted?: boolean;
  savedLocations: SavedAddress[];
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
  trustScore?: number;
  starRating?: number;
  totalOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  cancellationRate?: number;
  trustTier?: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'RESTRICTED';
  bookingCooldownUntil?: string | null;
  dealerRatingsCount?: number;
  dealerRatingsTotal?: number;
  dealerReviews?: Array<{
    dealerId: string;
    dealerName?: string;
    dealerBusinessName?: string;
    score: number;
    feedback?: string;
    tags?: string[];
    orderId: string;
    createdAt: string;
  }>;
}

export interface Dealer {
  dealerId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  rating: number;
  totalRatings: number;
  isAvailable: boolean;
  isOnline?: boolean;
  isBusy?: boolean;
  distanceKm: number;
  etaMinutes: number;
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  address: string;
  vehicleType: string;
  scrapRates: ScrapRateItem[];
}

export interface SelectedMaterialItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  estimatedWeightKg: number;
  calculatedAmount: number;
}

export interface FinalWeightItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  actualWeightKg: number;
  finalAmount: number;
}

export interface DealerLiveLocation {
  coordinates: [number, number]; // [lng, lat]
  heading?: number;
  speed?: number;
  updatedAt: string;
  etaMinutes?: number;
  distanceKm?: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
}

export interface Order {
  _id?: string;
  orderId: string;
  consumerId: string;
  dealerId: string;
  dealerSnapshot: {
    businessName: string;
    contactPerson: string;
    phone: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };
  pickupAddress: string;
  pickupLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  selectedMaterials: SelectedMaterialItem[];
  dealerPricesSnapshot: ScrapRateItem[];
  estimatedTotalAmount: number;
  finalWeights?: FinalWeightItem[];
  finalTotalAmount?: number;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  otp: {
    code: string;
    expiresAt: string;
    verifiedAt?: string;
    isVerified: boolean;
  };
  dealerLiveLocation?: DealerLiveLocation;
  cancellationReason?: string;
  rated: boolean;
  scrapPhoto?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  _id?: string;
  orderId: string;
  consumerId: string;
  dealerId: string;
  score: number;
  feedback?: string;
  tags: string[];
  createdAt: string;
}

export interface CategoryCardInfo {
  id: ScrapCategory;
  name: string;
  avgPrice: number;
  unit: string;
  icon: string;
  description: string;
}

export type RecycledCategory =
  | 'Furniture'
  | 'Chairs & Tables'
  | 'Home & Kitchen'
  | 'Garden Products'
  | 'Dustbins'
  | 'Home Decor'
  | 'Bags & Accessories'
  | 'Other Recycled Products';

export interface RecycledProductSpecification {
  key: string;
  value: string;
}

export interface RecyclerProfile {
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
  products: RecycledProduct[];
  isVerified?: boolean;
}

export interface RecycledProduct {
  _id?: string;
  productId: string;
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
  maxRewardCoins: number;
  stock: number;
  specifications: RecycledProductSpecification[];
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType = 'EARNED' | 'REDEEMED';
export type WalletTransactionSource =
  | 'SCRAP_TRANSACTION'
  | 'PRODUCT_PURCHASE'
  | 'REFUND'
  | 'ADMIN';

export interface WalletData {
  availableCoins: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt?: string;
}

export interface WalletTransaction {
  _id?: string;
  id?: string;
  userId: string;
  walletId: string;
  type: WalletTransactionType;
  source: WalletTransactionSource;
  referenceId: string;
  coins: number;
  balanceAfter: number;
  dealAmount?: number;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StoreOrder {
  _id?: string;
  orderId: string;
  consumerId: string;
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
  createdAt: string;
}

