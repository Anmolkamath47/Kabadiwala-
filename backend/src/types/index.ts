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

export interface LocationGeoJSON {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface SavedAddress {
  _id?: string;
  label: 'Home' | 'Work' | 'Other';
  address: string;
  landmark?: string;
  coordinates: [number, number]; // [lng, lat]
  isDefault?: boolean;
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

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
}

export interface DealerLiveLocationUpdate {
  coordinates: [number, number]; // [lng, lat]
  heading?: number;
  speed?: number;
  updatedAt: Date;
  etaMinutes?: number;
  distanceKm?: number;
}

export interface SocketAuthUser {
  userId: string;
  phone: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
}
