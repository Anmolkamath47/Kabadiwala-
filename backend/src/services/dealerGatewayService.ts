import axios from 'axios';
import { DealerSnapshot, IDealerSnapshot } from '../models/DealerSnapshot.js';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo.js';
import { ScrapCategory } from '../types/index.js';
import { config } from '../config/index.js';

export interface NearbyDealerResult {
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
  scrapRates: Array<{
    category: ScrapCategory;
    name: string;
    unit: 'kg' | 'piece';
    pricePerKg: number;
    minQuantityKg?: number;
    icon?: string;
  }>;
}

const DUMMY_DEALER_IDS = new Set([
  'DLR-BLR-001',
  'DLR-RAMESH-001',
  'DLR-SURESH-002',
  'DLR-530794',
]);

const DUMMY_DEALER_NAMES = new Set([
  'GreenEarth Scrap Hub',
  'Ramesh Green Recycling',
  'Verma Scrap & Metals',
  'Arun Scrap Traders',
]);

const isDummyDealer = (d: any): boolean => {
  if (!d) return true;
  if (d.dealerId && DUMMY_DEALER_IDS.has(d.dealerId)) return true;
  if (d.businessName && DUMMY_DEALER_NAMES.has(d.businessName)) return true;
  return false;
};

export class DealerGatewayService {
  /**
   * Helper headers for authenticating internal requests to Kabadidealer
   */
  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dealer-api-key': config.dealerServiceApiKey,
    };
  }

  /**
   * 1. Discover active nearby dealers by calling the Kabadidealer Partner Backend
   * Does NOT copy dealer data into the Kabadiwala database.
   */
  static async getNearbyDealers(
    lat: number,
    lng: number,
    radiusKm: number = config.defaultSearchRadiusKm,
    category?: ScrapCategory
  ): Promise<NearbyDealerResult[]> {
    try {
      const response = await axios.get(
        `${config.kabadidealerApiUrl}/dealers/nearby`,
        {
          params: { lat, lng, radius: radiusKm },
          headers: this.getHeaders(),
          timeout: 4000,
        }
      );

      if (response.data && response.data.data && Array.isArray(response.data.data.dealers)) {
        const dealers = response.data.data.dealers;
        const results: NearbyDealerResult[] = [];

        for (const dealer of dealers) {
          if (isDummyDealer(dealer)) continue;

          let rates = dealer.scrapRates || [];
          if (category) {
            rates = rates.filter(
              (r: any) => r.category?.toLowerCase() === category.toLowerCase()
            );
          }

          results.push({
            dealerId: dealer.dealerId,
            businessName: dealer.businessName,
            contactPerson: dealer.contactPerson,
            phone: dealer.phone,
            rating: dealer.rating ?? 4.8,
            totalRatings: dealer.totalRatings ?? 0,
            isAvailable: dealer.isAvailable ?? true,
            isOnline: dealer.isOnline ?? true,
            isBusy: dealer.isBusy ?? false,
            distanceKm: dealer.distanceKm,
            etaMinutes: dealer.etaMinutes ?? estimateEtaMinutes(dealer.distanceKm),
            location: {
              coordinates: dealer.location?.coordinates || [lng, lat],
            },
            address: dealer.address || dealer.location?.address || 'Pickup Radius Area',
            vehicleType: dealer.vehicleType || 'Electric Mini Loader',
            scrapRates: rates,
          });
        }

        return results.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
      }
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Kabadidealer API unreachable (${err.message}). Using local fallback.`
      );
    }

    // Graceful Fallback to local snapshot DB (e.g. for offline test suites)
    const query: any = { isAvailable: true };
    const dealers = (await DealerSnapshot.find(query).lean()) as unknown as IDealerSnapshot[];
    const results: NearbyDealerResult[] = [];

    for (const dealer of dealers) {
      if (isDummyDealer(dealer)) continue;

      const [dealerLng, dealerLat] = dealer.location.coordinates;
      const distance = calculateDistanceKm(lat, lng, dealerLat, dealerLng);
      const effectiveRadius = radiusKm >= 100 ? radiusKm : Math.max(radiusKm, dealer.activeRadiusKm || 15);

      if (distance <= effectiveRadius) {
        let rates = dealer.scrapRates;
        if (category) {
          rates = rates.filter((r) => r.category.toLowerCase() === category.toLowerCase());
        }

        results.push({
          dealerId: dealer.dealerId,
          businessName: dealer.businessName,
          contactPerson: dealer.contactPerson,
          phone: dealer.phone,
          rating: dealer.rating,
          totalRatings: dealer.totalRatings,
          isAvailable: dealer.isAvailable ?? true,
          isOnline: dealer.isAvailable ?? true,
          distanceKm: distance,
          etaMinutes: estimateEtaMinutes(distance),
          location: {
            coordinates: [dealerLng, dealerLat],
          },
          address: dealer.address,
          vehicleType: dealer.vehicleType,
          scrapRates: rates,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
  }

  /**
   * 2. Get single dealer profile with all scrap pricing from Kabadidealer backend
   */
  static async getDealerById(dealerId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${config.kabadidealerApiUrl}/dealers/${dealerId}`,
        {
          headers: this.getHeaders(),
          timeout: 4000,
        }
      );

      if (response.data && response.data.data) {
        return response.data.data;
      }
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Dealer ${dealerId} query from Kabadidealer failed (${err.message}). Checking local snapshot.`
      );
    }

    // Fallback to local DealerSnapshot
    return DealerSnapshot.findOne({ dealerId }).lean();
  }

  /**
   * 3. & 4. Notify Kabadidealer partner backend of a new pickup booking
   * Alerts the assigned dealer in real time via POST /api/internal/consumer/new-pickup
   */
  static async notifyDealerNewPickup(
    order: any,
    customerUser?: { name?: string; phone: string }
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadidealerApiUrl}/internal/consumer/new-pickup`,
        {
          orderId: order.orderId,
          dealerId: order.dealerId,
          consumerId: order.consumerId?.toString(),
          customerName: customerUser?.name || 'Consumer Customer',
          customerPhone: customerUser?.phone || '+91 98765 43210',
          pickupAddress: order.pickupAddress,
          pickupLocation: order.pickupLocation?.coordinates,
          selectedMaterials: order.selectedMaterials,
          estimatedTotalAmount: order.estimatedTotalAmount,
          otpCode: order.otp?.code,
          notes: order.notes,
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Failed to notify Kabadidealer backend: ${err.message}`
      );
      return false;
    }
  }

  /**
   * 10. Submit consumer rating and feedback to Kabadidealer partner backend
   */
  static async submitDealerRating(
    dealerId: string,
    data: {
      orderId: string;
      score: number;
      feedback?: string;
      tags?: string[];
    }
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadidealerApiUrl}/internal/consumer/dealers/${dealerId}/rating`,
        data,
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Failed to forward rating to Kabadidealer: ${err.message}`
      );
      return false;
    }
  }

  /**
   * Update dealer live location (optional local cache update)
   */
  static async updateDealerLocation(
    dealerId: string,
    lng: number,
    lat: number
  ): Promise<IDealerSnapshot | null> {
    return DealerSnapshot.findOneAndUpdate(
      { dealerId },
      {
        location: { type: 'Point', coordinates: [lng, lat] },
        lastActiveAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Forward order cancellation event to Kabadidealer partner backend
   */
  static async notifyOrderCancelled(
    orderId: string,
    dealerId: string,
    options: { reason?: string; cancelledBy?: string } = {}
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadidealerApiUrl}/internal/consumer/cancel`,
        {
          orderId,
          dealerId,
          reason: options.reason || 'Cancelled by consumer',
          cancelledBy: options.cancelledBy || 'CONSUMER',
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Failed to notify Kabadidealer backend of cancellation: ${err.message}`
      );
      return false;
    }
  }

  /**
   * Forward consumer chat message to Kabadidealer partner backend
   */
  static async forwardConsumerChatMessage(
    orderId: string,
    dealerId: string,
    message: {
      id: string;
      sender: 'consumer';
      senderName: string;
      text: string;
      timestamp: string;
    }
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadidealerApiUrl}/internal/consumer/chat`,
        {
          orderId,
          dealerId,
          message,
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(
        `⚠️ [DealerGatewayService] Failed to forward consumer chat message: ${err.message}`
      );
      return false;
    }
  }
}
