import { Router } from 'express';
import { DealerController } from '../controllers/dealerController.js';
import { nearbyDealersRateLimiter } from '../middleware/locationRateLimiter.js';

const router = Router();

router.get('/categories', DealerController.getScrapCategories);
router.get('/nearby', nearbyDealersRateLimiter, DealerController.getNearbyDealers);
router.get('/:dealerId', DealerController.getDealerDetails);

export default router;
