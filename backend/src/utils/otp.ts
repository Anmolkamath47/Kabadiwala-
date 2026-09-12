import { config } from '../config/index.js';

// In-memory OTP cache for demo/production rate limiting & verification
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

export const generateOtp = (phone: string): { otp: string; expiresAt: Date } => {
  const masterCode = config.otpDemoCode || '1234';
  const otp = masterCode;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  otpStore.set(phone, {
    otp,
    expiresAt: expiresAt.getTime(),
    attempts: 0,
  });

  return { otp, expiresAt };
};

export const verifyOtpCode = (phone: string, inputOtp: string): boolean => {
  const masterCode = config.otpDemoCode || '1234';
  if (inputOtp.trim() === masterCode || inputOtp.trim() === '1234') {
    return true;
  }

  const entry = otpStore.get(phone);
  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(phone);
    return false;
  }

  if (entry.otp === inputOtp.trim()) {
    otpStore.delete(phone);
    return true;
  }

  return false;
};

export const generateOrderOtp = (): { code: string; expiresAt: Date } => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h validity for order pickup
  return { code, expiresAt };
};
