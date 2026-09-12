import { Router } from 'express';
import { DealerController } from '../controllers/dealerController.js';

const router = Router();

router.get('/categories', DealerController.getScrapCategories);
router.get('/nearby', DealerController.getNearbyDealers);
router.get('/:dealerId', DealerController.getDealerDetails);

export default router;
