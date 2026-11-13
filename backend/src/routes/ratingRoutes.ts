import { Router } from 'express';
import {
  RatingController,
  CreateRatingSchema,
} from '../controllers/ratingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', validateRequest(CreateRatingSchema), RatingController.rateOrder);
router.get('/order/:orderId', RatingController.getOrderRating);

export default router;
