import { User, IUser } from '../models/User.js';
import { generateOtp, verifyOtpCode } from '../utils/otp.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export class AuthService {
  /**
   * Request an OTP for a mobile number
   */
  static async requestOtp(phone: string): Promise<{ message: string; expiresAt: Date; demoOtp?: string }> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    const { otp, expiresAt } = generateOtp(cleanPhone);

    console.log(`📱 [SMS Gateway Simulator] OTP for ${cleanPhone} is: ${otp}`);

    return {
      message: 'OTP sent successfully to your mobile phone',
      expiresAt,
      ...(process.env.NODE_ENV === 'development' ? { demoOtp: otp } : {}),
    };
  }

  /**
   * Verify OTP and Login / Register Consumer
   */
  static async verifyOtpAndLogin(
    phone: string,
    otp: string,
    initialName?: string
  ): Promise<{
    user: IUser;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();

    const isValid = verifyOtpCode(cleanPhone, otp);
    if (!isValid) {
      throw new Error('Invalid or expired OTP. Please try again.');
    }

    let isNewUser = false;
    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      isNewUser = true;
      user = await User.create({
        phone: cleanPhone,
        name: initialName?.trim() || 'Scrap Seller',
        savedLocations: [],
        currentLocation: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
          address: 'Location not configured',
        },
      });
    }

    const payload = { userId: (user._id as any).toString(), phone: user.phone };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokenHash = refreshToken;
    await user.save();

    return {
      user,
      accessToken,
      refreshToken,
      isNewUser,
    };
  }

  /**
   * Refresh Access Token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId);

      if (!user || user.refreshTokenHash !== refreshToken) {
        throw new Error('Invalid refresh token.');
      }

      const newAccessToken = generateAccessToken({
        userId: (user._id as any).toString(),
        phone: user.phone,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }
  }
}
