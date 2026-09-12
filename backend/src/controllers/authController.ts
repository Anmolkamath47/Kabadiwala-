import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number too long'),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(4, 'OTP must be 4 digits'),
  name: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  static async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await AuthService.requestOtp(phone);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp, name } = req.body;
      const result = await AuthService.verifyOtpAndLogin(phone, otp, name);

      res.status(200).json({
        success: true,
        message: result.isNewUser
          ? 'Account created and verified successfully'
          : 'Login successful',
        data: {
          user: {
            id: (result.user._id as any).toString(),
            phone: result.user.phone,
            name: result.user.name,
            profileImage: result.user.profileImage || '',
            email: result.user.email || '',
            isProfileCompleted: result.user.isProfileCompleted || false,
            savedLocations: result.user.savedLocations,
            currentLocation: result.user.currentLocation,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isNewUser: result.isNewUser,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'OTP verification failed',
      });
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Failed to refresh token',
      });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: (req.user._id as any).toString(),
            phone: req.user.phone,
            name: req.user.name,
            profileImage: req.user.profileImage || '',
            email: req.user.email || '',
            isProfileCompleted: req.user.isProfileCompleted || false,
            savedLocations: req.user.savedLocations,
            currentLocation: req.user.currentLocation,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
