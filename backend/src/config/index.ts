import dotenv from 'dotenv';
dotenv.config();

const normalizeApiUrl = (url?: string, defaultUrl: string = 'http://localhost:5001/api'): string => {
  const target = url?.trim() || defaultUrl;
  let clean = target.replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
};

const defaultDealerApi =
  process.env.NODE_ENV === 'production'
    ? 'https://kabadidealer-backend.onrender.com/api'
    : 'http://localhost:5001/api';

const resolvedDealerApiUrl = normalizeApiUrl(
  process.env.KABADIDEALER_API_URL || process.env.DEALER_API_URL,
  defaultDealerApi
);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'kabadiwala_super_secret_jwt_key_2026_production_grade',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'kabadiwala_refresh_token_secret_key_2026',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kabadiwala_consumer',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test',
  dealerApiUrl: resolvedDealerApiUrl,
  kabadidealerApiUrl: resolvedDealerApiUrl,
  kabadidealerSocketUrl: process.env.KABADIDEALER_SOCKET_URL || (process.env.NODE_ENV === 'production' ? 'https://kabadidealer-backend.onrender.com' : 'http://localhost:5001'),
  dealerServiceApiKey: process.env.DEALER_SERVICE_API_KEY || 'kbad_shared_internal_secret_key_9988',
  otpDemoCode: process.env.OTP_DEMO_CODE || '1234',
  defaultSearchRadiusKm: 15,
};

