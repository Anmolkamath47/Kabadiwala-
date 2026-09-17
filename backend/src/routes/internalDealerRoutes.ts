import { Router } from 'express';
import {
  InternalDealerController,
  DealerPresenceSchema,
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
  '/presence',
  validateRequest(DealerPresenceSchema),
  InternalDealerController.updateDealerPresence
);
router.post(
  '/dealer-status',
  validateRequest(DealerPresenceSchema),
  InternalDealerController.updateDealerPresence
);
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

router.post(
  '/chat',
  InternalDealerController.handleDealerChatMessage
);

export default router;
