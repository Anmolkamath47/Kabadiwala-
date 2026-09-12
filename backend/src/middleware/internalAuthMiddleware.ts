import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export const requireDealerInternalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-dealer-api-key'] || req.headers['x-internal-key'];

  // In development, allow demo testing if header is set or dev fallback
  if (apiKey && apiKey === config.dealerServiceApiKey) {
    next();
    return;
  }

  // Also accept in local development if apiKey matches or is provided in query
  if (config.nodeEnv === 'development' && (req.query.dev_key === config.dealerServiceApiKey || apiKey === 'dev-key')) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden. Invalid or missing Dealer API Key.',
  });
};
