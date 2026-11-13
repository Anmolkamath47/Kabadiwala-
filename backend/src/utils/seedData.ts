import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { RecycledProduct } from '../models/RecycledProduct.js';

export const initialDealers: any[] = [];

/**
 * Purge any fake or dummy recycled products and fake recyclers from the database.
 * Real products are strictly added by registered recyclers/dealers through their partner portal.
 */
export const purgeDummyRecycledProducts = async (): Promise<void> => {
  try {
    const dummyProductIds = [
      'REC-FURN-001',
      'REC-CHAIR-002',
      'REC-KIT-003',
      'REC-GARD-004',
      'REC-DUST-005',
      'REC-DECR-006',
      'REC-BAG-007',
      'REC-OTHR-008',
      'REC-FURN-009',
      'REC-CHAIR-010',
      'REC-KIT-011',
      'REC-GARD-012',
      'REC-DUST-013',
      'REC-DECR-014',
      'REC-BAG-015',
      'REC-OTHR-016',
    ];

    const dummyRecyclerNames = [
      'EcoCraft Reclaimers',
      'PlantyPaper Co.',
      'BlueCycle Creations',
      'TreadCycle Solutions',
      'LoomCycle India',
      'Lumina Upcycled Glass',
      'VerdeRecycle Tech',
      'CleanCity EcoCraft',
    ];

    const dummyRecyclerIds = [
      'REC-BGL-101',
      'REC-PPR-102',
      'REC-DEN-103',
      'REC-RBR-104',
      'REC-TEX-105',
      'REC-GLS-106',
      'REC-EV-107',
      'REC-WST-108',
    ];

    const result = await RecycledProduct.deleteMany({
      $or: [
        { productId: { $in: dummyProductIds } },
        { recyclerName: { $in: dummyRecyclerNames } },
        { recyclerId: { $in: dummyRecyclerIds } },
      ],
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Purged ${result.deletedCount} dummy recycled product(s) from database`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Failed to purge dummy recycled products: ${err.message}`);
  }
};

export const seedDealers = async (): Promise<void> => {
  try {
    // Purge any and all dummy dealer instances from the database
    const result = await DealerSnapshot.deleteMany({
      $or: [
        { dealerId: { $in: ['DLR-BLR-001', 'DLR-RAMESH-001', 'DLR-SURESH-002', 'DLR-530794'] } },
        {
          businessName: {
            $in: [
              'GreenEarth Scrap Hub',
              'Ramesh Green Recycling',
              'Verma Scrap & Metals',
              'Arun Scrap Traders',
            ],
          },
        },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Purged ${result.deletedCount} dummy dealer snapshot(s) from MongoDB`);
    }

    // Purge any dummy recycled products so only real recyclers and their products exist
    await purgeDummyRecycledProducts();
  } catch (err: any) {
    console.warn(`⚠️ Failed to seed/purge dealer snapshots: ${err.message}`);
  }
};
