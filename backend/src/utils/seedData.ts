import { DealerSnapshot } from '../models/DealerSnapshot.js';

export const initialDealers = [
  {
    dealerId: 'DLR-530794',
    businessName: 'Arun Scrap Traders',
    contactPerson: 'Arun Kumar',
    phone: '+919911223344',
    rating: 4.9,
    totalRatings: 156,
    isAvailable: true,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.2090, 28.6139] as [number, number],
    },
    address: 'Shop 14, Main Scrap Market, Sector 12, New Delhi - 110001',
    vehicleType: 'Electric Scrap Loader',
    vehicleNumber: 'DL-01-EV-9821',
    scrapRates: [
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
    ],
  },
  {
    dealerId: 'DLR-RAMESH-001',
    businessName: 'Ramesh Green Recycling',
    contactPerson: 'Ramesh Kumar',
    phone: '+919876543210',
    rating: 4.9,
    totalRatings: 142,
    isAvailable: true,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.2150, 28.6250] as [number, number],
    },
    address: 'Plot 44, Recycling Estate, Connaught Place, New Delhi - 110001',
    vehicleType: 'Electric Mini Loader 800kg',
    vehicleNumber: 'DL 1AA 1234',
    scrapRates: [
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
    ],
  },
  {
    dealerId: 'DLR-SURESH-002',
    businessName: 'Verma Scrap & Metals',
    contactPerson: 'Suresh Verma',
    phone: '+919876543211',
    rating: 4.7,
    totalRatings: 89,
    isAvailable: true,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.1900, 28.6500] as [number, number],
    },
    address: 'Shop 18, Metal Market, Karol Bagh, New Delhi - 110005',
    vehicleType: 'Tata Ace Scrap Hauler',
    vehicleNumber: 'DL 1BB 5678',
    scrapRates: [
      { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 15, minQuantityKg: 5, icon: 'newspaper' },
      { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 11, minQuantityKg: 5, icon: 'box' },
      { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 35, minQuantityKg: 5, icon: 'wrench' },
      { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 140, minQuantityKg: 1, icon: 'utensils' },
      { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 485, minQuantityKg: 0.5, icon: 'zap' },
      { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 335, minQuantityKg: 0.5, icon: 'shield' },
      { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 18, minQuantityKg: 2, icon: 'bottle' },
    ],
  },
  {
    dealerId: 'DLR-BLR-001',
    businessName: 'GreenEarth Scrap Hub',
    contactPerson: 'Arjun Rao',
    phone: '+919886012345',
    rating: 4.9,
    totalRatings: 142,
    isAvailable: true,
    activeRadiusKm: 15,
    location: {
      type: 'Point' as const,
      coordinates: [77.5058, 13.04314] as [number, number],
    },
    address: 'Nele Maheshwaramma Temple Ward, Chokkasandra, Bengaluru - 560057',
    vehicleType: 'Electric Scrap Loader',
    vehicleNumber: 'KA-04-EV-1024',
    scrapRates: [
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
    ],
  },
];

export const seedDealers = async (): Promise<void> => {
  try {
    for (const dealer of initialDealers) {
      await DealerSnapshot.updateOne(
        { dealerId: dealer.dealerId },
        { $setOnInsert: dealer },
        { upsert: true }
      );
    }
    console.log(`✅ Seeded ${initialDealers.length} fallback active dealers into DealerSnapshot DB`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to seed dealer snapshots: ${err.message}`);
  }
};

