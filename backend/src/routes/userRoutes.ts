import { Router } from 'express';
import {
  UserController,
  UpdateProfileSchema,
  SavedLocationSchema,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', UserController.getProfile);
router.patch('/profile', validateRequest(UpdateProfileSchema), UserController.updateProfile);
router.get('/locations', UserController.getSavedLocations);
router.post('/locations', validateRequest(SavedLocationSchema), UserController.addSavedLocation);
router.put('/locations/:locationId', validateRequest(SavedLocationSchema), UserController.updateSavedLocation);
router.delete('/locations/:locationId', UserController.deleteSavedLocation);

export default router;
