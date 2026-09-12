import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  profileImage: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isProfileCompleted: z.boolean().optional(),
  currentLocation: z
    .object({
      coordinates: z.tuple([z.number(), z.number()]),
      address: z.string().optional(),
    })
    .optional(),
});

export const SavedLocationSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  landmark: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]),
  isDefault: z.boolean().optional(),
});

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getProfile((req.user!._id as any).toString());
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedUser = await UserService.updateProfile(
        (req.user!._id as any).toString(),
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavedLocations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: req.user!.savedLocations || [],
      });
    } catch (error) {
      next(error);
    }
  }

  static async addSavedLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.addSavedLocation(
        (req.user!._id as any).toString(),
        req.body
      );
      res.status(201).json({
        success: true,
        message: 'Address saved successfully',
        data: user?.savedLocations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSavedLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const locationId = req.params.locationId as string;
      const user = await UserService.updateSavedLocation(
        (req.user!._id as any).toString(),
        locationId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: user?.savedLocations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSavedLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const locationId = req.params.locationId as string;
      const user = await UserService.deleteSavedLocation(
        (req.user!._id as any).toString(),
        locationId
      );
      res.status(200).json({
        success: true,
        message: 'Address deleted successfully',
        data: user?.savedLocations,
      });
    } catch (error) {
      next(error);
    }
  }
}
