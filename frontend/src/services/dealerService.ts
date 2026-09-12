import axios from 'axios';
import api from './api';
import { Dealer, ScrapCategory, CategoryCardInfo, ScrapRateItem } from '../types';

// Standard verified scrap rate catalogue
const DEFAULT_SCRAP_RATES: ScrapRateItem[] = [
  { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, minQuantityKg: 5, icon: 'newspaper' },
  { category: 'Paper', name: 'Books & Notebooks', unit: 'kg', pricePerKg: 12, minQuantityKg: 5, icon: 'book' },
  { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 10, minQuantityKg: 5, icon: 'box' },
  { category: 'Plastic', name: 'Hard Plastics / Buckets / Mugs', unit: 'kg', pricePerKg: 16, minQuantityKg: 2, icon: 'wine' },
  { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 20, minQuantityKg: 2, icon: 'bottle' },
  { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, minQuantityKg: 5, icon: 'wrench' },
  { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 145, minQuantityKg: 1, icon: 'utensils' },
  { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 490, minQuantityKg: 0.5, icon: 'zap' },
  { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 340, minQuantityKg: 0.5, icon: 'shield' },
  { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
  { category: 'Glass', name: 'Glass Bottles', unit: 'kg', pricePerKg: 4, minQuantityKg: 5, icon: 'wine' },
];

const DEFAULT_CATEGORIES: CategoryCardInfo[] = [
  { id: 'Paper', name: 'Newspaper & Books', icon: 'newspaper', avgPrice: 14, unit: 'kg', description: 'Old newspapers, magazines, office paper, and student notebooks' },
  { id: 'Cardboard', name: 'Cardboard & Cartons', icon: 'box', avgPrice: 10, unit: 'kg', description: 'Corrugated packing boxes, cartons, and packaging gatta' },
  { id: 'Plastic', name: 'Plastics & PET Bottles', icon: 'bottle', avgPrice: 18, unit: 'kg', description: 'Clean PET bottles, plastic buckets, containers, and household PVC' },
  { id: 'Metal', name: 'Iron & Steel Scrap', icon: 'wrench', avgPrice: 34, unit: 'kg', description: 'Iron rods, pipes, household metal scraps, and appliances' },
  { id: 'Aluminium', name: 'Aluminium Scrap', icon: 'utensils', avgPrice: 145, unit: 'kg', description: 'Aluminium cans, sheets, window frames, and kitchen utensils' },
  { id: 'Copper', name: 'Copper Wires', icon: 'zap', avgPrice: 490, unit: 'kg', description: 'Electrical copper wiring, armature motors, and pipes' },
  { id: 'Brass', name: 'Brass (Peetal)', icon: 'shield', avgPrice: 340, unit: 'kg', description: 'Brass utensils, antique items, valves, and decorative items' },
  { id: 'E-Waste', name: 'Electronic Waste', icon: 'cpu', avgPrice: 55, unit: 'kg', description: 'Laptops, mobile phones, printed circuit boards, and wires' },
  { id: 'Glass', name: 'Glass Bottles', icon: 'wine', avgPrice: 4, unit: 'kg', description: 'Intact glass bottles, beverage jars, and glass containers' },
];

// Helper: Haversine distance in km
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const estimateEtaMinutes = (distanceKm: number): number => {
  if (distanceKm <= 0.1) return 1;
  return Math.ceil((distanceKm / 20) * 60) + 3;
};

const resolvePartnerApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_DEALER_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return `http://${host}:5001/api`;
    }
  }
  return 'http://localhost:5001/api';
};

export const dealerService = {
  /**
   * Multi-tier resilient discovery:
   * 1. Consumer Backend API (/dealers/nearby)
   * 2. Direct Partner Dealer Backend API (port 5001 / dealers/nearby)
   * 3. Resilient Live / Dynamic Catalogue Fallback
   */
  async getNearbyDealers(
    lat: number,
    lng: number,
    radius: number = 15,
    category?: ScrapCategory
  ): Promise<{ dealers: Dealer[]; count: number }> {
    const params: any = { lat, lng, radius };
    if (category) params.category = category;

    // --- Tier 1: Try Primary Consumer Backend ---
    try {
      const res = await api.get('/dealers/nearby', { params, timeout: 3500 });
      if (res.data?.data && Array.isArray(res.data.data.dealers)) {
        return res.data.data;
      }
    } catch (err: any) {
      console.warn('⚠️ [DealerService] Consumer backend unreachable or error. Trying Direct Partner API...', err.message);
    }

    // --- Tier 2: Try Direct Partner Dealer Backend (e.g. port 5001) ---
    try {
      const partnerUrl = `${resolvePartnerApiUrl()}/dealers/nearby`;
      const partnerRes = await axios.get(partnerUrl, { params, timeout: 3500 });
      if (partnerRes.data?.data && Array.isArray(partnerRes.data.data.dealers)) {
        let dealers: Dealer[] = partnerRes.data.data.dealers;
        if (category) {
          dealers = dealers.map((d) => ({
            ...d,
            scrapRates: d.scrapRates?.filter((r) => r.category?.toLowerCase() === category.toLowerCase()) || [],
          }));
        }
        return {
          dealers,
          count: dealers.length,
        };
      }
    } catch (partnerErr: any) {
      console.warn('⚠️ [DealerService] Direct Partner API unreachable:', partnerErr.message);
    }

    // --- Tier 3: Resilient Fallback with Dynamic Distances & Active Partner Dealers ---
    return this.getFallbackDealers(lat, lng, radius, category);
  },

  /**
   * Fetch all active dealers regardless of radius (e.g. across cities)
   * Allows the UI to inform the user if active dealers exist in other locations
   */
  async getAllActiveDealers(
    lat: number,
    lng: number
  ): Promise<{ dealers: Dealer[]; count: number }> {
    return this.getNearbyDealers(lat, lng, 5000);
  },

  async getDealerDetails(dealerId: string): Promise<Dealer> {
    // 1. Try Consumer Backend
    try {
      const res = await api.get(`/dealers/${dealerId}`, { timeout: 3500 });
      if (res.data?.data) return res.data.data;
    } catch {
      // Ignore and proceed to Tier 2
    }

    // 2. Try Direct Partner Backend
    try {
      const partnerUrl = `${resolvePartnerApiUrl()}/dealers/${dealerId}`;
      const res = await axios.get(partnerUrl, { timeout: 3500 });
      if (res.data?.data) return res.data.data;
    } catch {
      // Ignore and proceed to Fallback
    }

    // 3. Fallback Catalogue
    const fallbackList = await this.getFallbackDealers(28.6250, 77.2150, 5000);
    const found = fallbackList.dealers.find((d) => d.dealerId === dealerId);
    if (found) return found;

    throw new Error(`Dealer ${dealerId} not found`);
  },

  async getScrapCategories(): Promise<CategoryCardInfo[]> {
    try {
      const res = await api.get('/dealers/categories', { timeout: 3500 });
      if (res.data?.data) return res.data.data;
    } catch {
      // Ignore and return defaults
    }
    return DEFAULT_CATEGORIES;
  },

  /**
   * Construct resilient fallback dealers with accurate distance calculation
   */
  getFallbackDealers(
    lat: number,
    lng: number,
    radiusKm: number = 15,
    category?: ScrapCategory
  ): { dealers: Dealer[]; count: number } {
    const baseDealers = [
      {
        dealerId: 'DLR-530794',
        businessName: 'Arun Scrap Traders',
        contactPerson: 'Arun Kumar',
        phone: '+91 99112 23344',
        rating: 4.9,
        totalRatings: 156,
        isAvailable: true,
        isOnline: true,
        isBusy: false,
        location: { coordinates: [77.2090, 28.6139] as [number, number] },
        address: 'Shop 14, Main Scrap Market, Sector 12, New Delhi - 110001',
        vehicleType: 'Electric Scrap Loader',
        scrapRates: DEFAULT_SCRAP_RATES,
      },
      {
        dealerId: 'DLR-RAMESH-001',
        businessName: 'Ramesh Green Recycling',
        contactPerson: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        rating: 4.9,
        totalRatings: 142,
        isAvailable: true,
        isOnline: true,
        isBusy: false,
        location: { coordinates: [77.2150, 28.6250] as [number, number] },
        address: 'Plot 44, Recycling Estate, Connaught Place, New Delhi - 110001',
        vehicleType: 'Electric Mini Loader 800kg',
        scrapRates: DEFAULT_SCRAP_RATES,
      },
      {
        dealerId: 'DLR-SURESH-002',
        businessName: 'Verma Scrap & Metals',
        contactPerson: 'Suresh Verma',
        phone: '+91 98765 43211',
        rating: 4.7,
        totalRatings: 89,
        isAvailable: true,
        isOnline: true,
        isBusy: false,
        location: { coordinates: [77.1900, 28.6500] as [number, number] },
        address: 'Shop 18, Metal Market, Karol Bagh, New Delhi - 110005',
        vehicleType: 'Tata Ace Scrap Hauler',
        scrapRates: DEFAULT_SCRAP_RATES,
      },
      {
        dealerId: 'DLR-BLR-001',
        businessName: 'Bangalore Green Scrap Hub',
        contactPerson: 'Arjun Kachrewala',
        phone: '+91 98860 12345',
        rating: 4.8,
        totalRatings: 68,
        isAvailable: true,
        isOnline: true,
        isBusy: false,
        location: { coordinates: [77.5058, 13.04314] as [number, number] },
        address: 'Chokkasandra, Peenya Industrial Area, Bengaluru - 560057',
        vehicleType: '3-Wheeler Auto Loader',
        scrapRates: DEFAULT_SCRAP_RATES,
      },
    ];

    // Check if an active partner dealer session is cached in localStorage or Broadcast
    if (typeof window !== 'undefined') {
      try {
        const cachedDealer = localStorage.getItem('kabadidealer_dealer');
        if (cachedDealer) {
          const parsed = JSON.parse(cachedDealer);
          if (parsed && parsed.dealerId && parsed.isOnline) {
            const existingIdx = baseDealers.findIndex((d) => d.dealerId === parsed.dealerId);
            const dynamicDealer = {
              dealerId: parsed.dealerId,
              businessName: parsed.businessName || 'Live Partner Scrap Hub',
              contactPerson: parsed.contactPerson || 'Active Partner',
              phone: parsed.phone || '+91 98765 00000',
              rating: parsed.rating || 5.0,
              totalRatings: parsed.totalRatings || 1,
              isAvailable: parsed.isOnline ?? true,
              isOnline: parsed.isOnline ?? true,
              isBusy: parsed.isBusy ?? false,
              location: { coordinates: parsed.location?.coordinates || [lng, lat] as [number, number] },
              address: parsed.location?.address || 'Live Partner Location',
              vehicleType: parsed.vehicleType || 'Electric Scrap Loader',
              scrapRates: parsed.scrapRates && parsed.scrapRates.length > 0 ? parsed.scrapRates : DEFAULT_SCRAP_RATES,
            };
            if (existingIdx >= 0) {
              baseDealers[existingIdx] = dynamicDealer;
            } else {
              baseDealers.unshift(dynamicDealer);
            }
          }
        }
      } catch {
        // Ignored
      }
    }

    const results: Dealer[] = [];
    for (const d of baseDealers) {
      if (!d.isOnline && !d.isAvailable) continue;
      const [dealerLng, dealerLat] = d.location.coordinates;
      const distance = calculateDistanceKm(lat, lng, dealerLat, dealerLng);

      if (distance <= radiusKm) {
        let rates = d.scrapRates;
        if (category) {
          rates = rates.filter((r) => r.category.toLowerCase() === category.toLowerCase());
        }

        results.push({
          dealerId: d.dealerId,
          businessName: d.businessName,
          contactPerson: d.contactPerson,
          phone: d.phone,
          rating: d.rating,
          totalRatings: d.totalRatings,
          isAvailable: true,
          isOnline: true,
          isBusy: d.isBusy,
          distanceKm: distance,
          etaMinutes: estimateEtaMinutes(distance),
          location: d.location,
          address: d.address,
          vehicleType: d.vehicleType,
          scrapRates: rates,
        });
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);

    return {
      dealers: results,
      count: results.length,
    };
  },
};
