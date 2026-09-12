import { Router } from 'express';
import {
  InternalDealerController,
  DealerStatusTransitionSchema,
  DealerLocationUpdateSchema,
  DealerOtpVerifySchema,
} from '../controllers/internalDealerController.js';
import { requireDealerInternalAuth } from '../middleware/internalAuthMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

// Secure webhook endpoints for separately deployed dealer service
router.use(requireDealerInternalAuth);

router.post(
  '/status',
  validateRequest(DealerStatusTransitionSchema),
  InternalDealerController.updateStatus
);
router.post(
  '/location',
  validateRequest(DealerLocationUpdateSchema),
  InternalDealerController.updateLocation
);
router.post(
  '/verify-otp',
  validateRequest(DealerOtpVerifySchema),
  InternalDealerController.verifyOtp
);

export default router;
