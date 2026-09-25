import axios from 'axios';
import api from './api';
import { Dealer, ScrapCategory, CategoryCardInfo, ScrapRateItem } from '../types';
import { reconcileCityCoordinates } from '../utils/geoUtils';

export const prioritizeEWasteRates = (rates: ScrapRateItem[]): ScrapRateItem[] => {
  if (!rates || !Array.isArray(rates)) return [];
  const ewaste = rates.filter((r) => r.category === 'E-Waste');
  const others = rates.filter((r) => r.category !== 'E-Waste');
  return [...ewaste, ...others];
};

// Standard verified scrap rate catalogue with E-Waste prioritized first
const DEFAULT_SCRAP_RATES: ScrapRateItem[] = [
  { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
  { category: 'E-Waste', name: 'Broken Laptops & Computers', unit: 'piece', pricePerKg: 250, minQuantityKg: 1, icon: 'laptop' },
  { category: 'E-Waste', name: 'Old Mobile Phones & Tablets', unit: 'piece', pricePerKg: 120, minQuantityKg: 1, icon: 'smartphone' },
  { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, minQuantityKg: 5, icon: 'newspaper' },
  { category: 'Paper', name: 'Books & Notebooks', unit: 'kg', pricePerKg: 12, minQuantityKg: 5, icon: 'book' },
  { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 10, minQuantityKg: 5, icon: 'box' },
  { category: 'Plastic', name: 'Hard Plastics / Buckets / Mugs', unit: 'kg', pricePerKg: 16, minQuantityKg: 2, icon: 'wine' },
  { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 20, minQuantityKg: 2, icon: 'bottle' },
  { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, minQuantityKg: 5, icon: 'wrench' },
  { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 145, minQuantityKg: 1, icon: 'utensils' },
  { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 490, minQuantityKg: 0.5, icon: 'zap' },
  { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 340, minQuantityKg: 0.5, icon: 'shield' },
  { category: 'Glass', name: 'Glass Bottles', unit: 'kg', pricePerKg: 4, minQuantityKg: 5, icon: 'wine' },
];

const DEFAULT_CATEGORIES: CategoryCardInfo[] = [
  { id: 'E-Waste', name: 'Electronic Waste', icon: 'cpu', avgPrice: 55, unit: 'kg', description: 'Laptops, mobile phones, printed circuit boards, and wires' },
  { id: 'Paper', name: 'Newspaper & Books', icon: 'newspaper', avgPrice: 14, unit: 'kg', description: 'Old newspapers, magazines, office paper, and student notebooks' },
  { id: 'Cardboard', name: 'Cardboard & Cartons', icon: 'box', avgPrice: 10, unit: 'kg', description: 'Corrugated packing boxes, cartons, and packaging gatta' },
  { id: 'Plastic', name: 'Plastics & PET Bottles', icon: 'bottle', avgPrice: 18, unit: 'kg', description: 'Clean PET bottles, plastic buckets, containers, and household PVC' },
  { id: 'Metal', name: 'Iron & Steel Scrap', icon: 'wrench', avgPrice: 34, unit: 'kg', description: 'Iron rods, pipes, household metal scraps, and appliances' },
  { id: 'Aluminium', name: 'Aluminium Scrap', icon: 'utensils', avgPrice: 145, unit: 'kg', description: 'Aluminium cans, sheets, window frames, and kitchen utensils' },
  { id: 'Copper', name: 'Copper Wires', icon: 'zap', avgPrice: 490, unit: 'kg', description: 'Electrical copper wiring, armature motors, and pipes' },
  { id: 'Brass', name: 'Brass (Peetal)', icon: 'shield', avgPrice: 340, unit: 'kg', description: 'Brass utensils, antique items, valves, and decorative items' },
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

export const DUMMY_DEALER_IDS = new Set([
  'DLR-BLR-001',
  'DLR-RAMESH-001',
  'DLR-SURESH-002',
  'DLR-530794',
]);

export const DUMMY_DEALER_NAMES = new Set([
  'GreenEarth Scrap Hub',
  'Ramesh Green Recycling',
  'Verma Scrap & Metals',
  'Arun Scrap Traders',
]);

export const isDummyDealer = (dealer: any): boolean => {
  if (!dealer) return true;
  if (dealer.dealerId && DUMMY_DEALER_IDS.has(dealer.dealerId)) return true;
  if (dealer.businessName && DUMMY_DEALER_NAMES.has(dealer.businessName)) return true;
  return false;
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
    if (window.location.protocol === 'https:' || host.includes('vercel.app')) {
      return 'https://kabadidealer-backend.onrender.com/api';
    }
  }
  return 'http://localhost:5001/api';
};

const mergePartnerDealer = (
  dealers: Dealer[],
  lat: number,
  lng: number,
  radiusKm: number = 15,
  category?: ScrapCategory
): Dealer[] => {
  if (typeof window === 'undefined') return dealers.filter((d) => !isDummyDealer(d));

  try {
    const cachedDealerStr = localStorage.getItem('kabadidealer_dealer');
    if (!cachedDealerStr) return dealers.filter((d) => !isDummyDealer(d));

    const parsed = JSON.parse(cachedDealerStr);
    if (!parsed || !parsed.dealerId) return dealers.filter((d) => !isDummyDealer(d));

    // Purge any dummy dealer from localStorage
    if (isDummyDealer(parsed)) {
      try {
        localStorage.removeItem('kabadidealer_dealer');
      } catch {}
      return dealers.filter((d) => !isDummyDealer(d));
    }

    const list = [...dealers].filter((d) => !isDummyDealer(d));
    const existingIdx = list.findIndex((d) => d.dealerId === parsed.dealerId);

    // If dealer has toggled offline
    if (parsed.isOnline === false) {
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          isOnline: false,
          isAvailable: false,
        };
      }
      return list;
    }

    // Dealer is online
    const rawCoords = parsed.location?.coordinates || [lng, lat];
    const dynamicCoords = reconcileCityCoordinates(
      parsed.location?.address,
      rawCoords
    );
    const [dealerLng, dealerLat] = dynamicCoords;
    const distance = calculateDistanceKm(lat, lng, dealerLat, dealerLng);

    const effectiveRadius = radiusKm >= 100 ? radiusKm : Math.max(radiusKm, parsed.activeRadiusKm || 15);
    if (radiusKm >= 100 || distance <= effectiveRadius) {
      let scrapRates =
        parsed.scrapRates && parsed.scrapRates.length > 0
          ? parsed.scrapRates
          : DEFAULT_SCRAP_RATES;
      if (category) {
        scrapRates = scrapRates.filter(
          (r: any) => r.category?.toLowerCase() === category.toLowerCase()
        );
      }
      scrapRates = prioritizeEWasteRates(scrapRates);

      const dynamicDealer: Dealer = {
        dealerId: parsed.dealerId,
        businessName: parsed.businessName || 'Scrap Collection Center',
        contactPerson: parsed.contactPerson || 'Partner Dealer',
        phone: parsed.phone || '+91 98860 12345',
        rating: parsed.rating || 4.9,
        totalRatings: parsed.totalRatings || 142,
        isAvailable: true,
        isOnline: true,
        isBusy: parsed.isBusy ?? false,
        distanceKm: distance,
        etaMinutes: estimateEtaMinutes(distance),
        location: {
          coordinates: [dealerLng, dealerLat],
        },
        address: parsed.location?.address || parsed.address || 'Pickup Service Area',
        vehicleType: parsed.vehicleType || 'Tata Ace Mini Truck',
        scrapRates,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = dynamicDealer;
      } else {
        list.unshift(dynamicDealer);
      }
    }

    list.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
    return list;
  } catch (err) {
    console.warn('[DealerService] Error merging partner dealer:', err);
    return dealers;
  }
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

    const collectedMap = new Map<string, Dealer>();

    const addDealers = (dealerList: Dealer[]) => {
      for (const d of dealerList) {
        if (!d || !d.dealerId || isDummyDealer(d)) continue;
        const [dLng, dLat] = d.location?.coordinates || [lng, lat];
        const dist = d.distanceKm ?? calculateDistanceKm(lat, lng, dLat, dLng);
        const effectiveRadius = radius >= 100 ? radius : Math.max(radius, (d as any).activeRadiusKm || 15);

        if (radius >= 100 || dist <= effectiveRadius) {
          collectedMap.set(d.dealerId, {
            ...d,
            distanceKm: dist,
            etaMinutes: d.etaMinutes ?? estimateEtaMinutes(dist),
            isOnline: d.isOnline ?? true,
            isAvailable: d.isAvailable ?? true,
          });
        }
      }
    };

    // --- Tier 1: Primary Consumer Backend API (/dealers/nearby) ---
    try {
      const res = await api.get('/dealers/nearby', { params, timeout: 3500 });
      if (res.data?.data?.dealers && Array.isArray(res.data.data.dealers)) {
        addDealers(res.data.data.dealers);
      }
    } catch (err: any) {
      console.warn('⚠️ [DealerService] Consumer backend unreachable or error:', err.message);
    }

    // --- Tier 2: Direct Partner Dealer Backend API (e.g. port 5001 /dealers/nearby) ---
    // Always query direct partner backend so active/newly registered dealers appear immediately!
    try {
      const partnerUrl = `${resolvePartnerApiUrl()}/dealers/nearby`;
      const partnerRes = await axios.get(partnerUrl, { params, timeout: 3500 });
      if (partnerRes.data?.data?.dealers && Array.isArray(partnerRes.data.data.dealers)) {
        let pDealers: Dealer[] = partnerRes.data.data.dealers;
        if (category) {
          pDealers = pDealers.map((d) => ({
            ...d,
            scrapRates: d.scrapRates?.filter((r) => r.category?.toLowerCase() === category.toLowerCase()) || [],
          }));
        }
        addDealers(pDealers);
      }
    } catch {
      // Direct Partner API quiet fallback
    }

    // --- Tier 3: If no registered dealers from APIs, check active partner session from localStorage only ---
    if (collectedMap.size === 0) {
      const fallback = this.getFallbackDealers(lat, lng, radius, category);
      addDealers(fallback.dealers);
    }

    // Apply any local cross-tab / cross-origin partner dealer session override
    const rawList = Array.from(collectedMap.values()).filter((d) => !isDummyDealer(d));
    const merged = mergePartnerDealer(rawList, lat, lng, radius, category);

    return {
      dealers: merged,
      count: merged.length,
    };
  },

  /**
   * Fetch all active dealers regardless of radius (e.g. across cities)
   * Allows the UI to inform the user if real active dealers exist in other locations
   */
  async getAllActiveDealers(
    lat: number,
    lng: number
  ): Promise<{ dealers: Dealer[]; count: number }> {
    return this.getNearbyDealers(lat, lng, 5000);
  },

  async getDealerDetails(dealerId: string): Promise<Dealer> {
    if (DUMMY_DEALER_IDS.has(dealerId)) {
      throw new Error(`Dealer ${dealerId} not found`);
    }

    // 1. Try Consumer Backend
    try {
      const res = await api.get(`/dealers/${dealerId}`, { timeout: 3500 });
      if (res.data?.data && !isDummyDealer(res.data.data)) return res.data.data;
    } catch {
      // Ignore and proceed to Tier 2
    }

    // 2. Try Direct Partner Backend
    try {
      const partnerUrl = `${resolvePartnerApiUrl()}/dealers/${dealerId}`;
      const res = await axios.get(partnerUrl, { timeout: 3500 });
      if (res.data?.data && !isDummyDealer(res.data.data)) return res.data.data;
    } catch {
      // Ignore and proceed to Fallback
    }

    // 3. Fallback Catalogue
    const fallbackList = this.getFallbackDealers(28.625, 77.215, 5000);
    const found = fallbackList.dealers.find((d) => d.dealerId === dealerId && !isDummyDealer(d));
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
   * ZERO dummy dealers. Only genuinely logged-in partner dealer session from localStorage if any.
   */
  getFallbackDealers(
    lat: number,
    lng: number,
    radiusKm: number = 15,
    category?: ScrapCategory
  ): { dealers: Dealer[]; count: number } {
    // No hardcoded dummy dealers in any location
    const baseDealers: Dealer[] = [];

    // Check if an active partner dealer session is cached in localStorage or Broadcast
    if (typeof window !== 'undefined') {
      try {
        const cachedDealer = localStorage.getItem('kabadidealer_dealer');
        if (cachedDealer) {
          const parsed = JSON.parse(cachedDealer);
          if (isDummyDealer(parsed)) {
            try {
              localStorage.removeItem('kabadidealer_dealer');
            } catch {}
          } else if (parsed && parsed.dealerId && parsed.isOnline) {
            const dynamicCoords = reconcileCityCoordinates(
              parsed.location?.address,
              parsed.location?.coordinates || [lng, lat]
            );
            const dist = calculateDistanceKm(lat, lng, dynamicCoords[1], dynamicCoords[0]);
            const dynamicDealer: Dealer = {
              dealerId: parsed.dealerId,
              businessName: parsed.businessName || 'Scrap Collection Center',
              contactPerson: parsed.contactPerson || 'Partner Dealer',
              phone: parsed.phone || '+91 98860 12345',
              rating: parsed.rating || 4.9,
              totalRatings: parsed.totalRatings || 142,
              isAvailable: parsed.isOnline ?? true,
              isOnline: parsed.isOnline ?? true,
              isBusy: parsed.isBusy ?? false,
              distanceKm: dist,
              etaMinutes: estimateEtaMinutes(dist),
              location: { coordinates: dynamicCoords as [number, number] },
              address: parsed.location?.address || 'Pickup Service Area',
              vehicleType: parsed.vehicleType || 'Tata Ace Mini Truck',
              scrapRates: parsed.scrapRates && parsed.scrapRates.length > 0 ? parsed.scrapRates : DEFAULT_SCRAP_RATES,
            };
            baseDealers.push(dynamicDealer);
          }
        }
      } catch {
        // Ignored
      }
    }

    const results: Dealer[] = [];
    for (const d of baseDealers) {
      if (isDummyDealer(d)) continue;
      if (!d.isOnline && !d.isAvailable) continue;
      const [dealerLng, dealerLat] = d.location.coordinates;
      const distance = calculateDistanceKm(lat, lng, dealerLat, dealerLng);

      if (radiusKm >= 100 || distance <= radiusKm) {
        let rates = d.scrapRates;
        if (category) {
          rates = rates.filter((r) => r.category.toLowerCase() === category.toLowerCase());
        }
        rates = prioritizeEWasteRates(rates);

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
