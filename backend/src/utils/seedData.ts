import { DealerSnapshot } from '../models/DealerSnapshot.js';

export const initialDealers: any[] = [];

export const seedDealers = async (): Promise<void> => {
  try {
    // Purge any and all dummy dealer instances from the database
    const result = await DealerSnapshot.deleteMany({
      $or: [
        { dealerId: { $in: ['DLR-BLR-001', 'DLR-RAMESH-001', 'DLR-SURESH-002', 'DLR-530794'] } },
        { businessName: { $in: ['GreenEarth Scrap Hub', 'Ramesh Green Recycling', 'Verma Scrap & Metals', 'Arun Scrap Traders'] } },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Purged ${result.deletedCount} dummy dealer snapshot(s) from MongoDB`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Failed to seed/purge dealer snapshots: ${err.message}`);
  }
};

