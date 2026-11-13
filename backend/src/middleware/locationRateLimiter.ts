import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validateCoordinates, encodeGeohash } from '../utils/geo.js';
import { rateLimitStore } from '../utils/rateLimitStore.js';
import { config } from '../config/index.js';

export const RATE_LIMIT_EXCEEDED_MESSAGE =
  'Due to high traffic, please wait a few moments and try again.';

export interface LocationRateLimiterOptions {
  /**
   * Maximum allowed requests per location (Geohash precision 6) within the window.
   * Defaults to 20 requests per minute.
   */
  maxLocationRequests?: number;

  /**
   * Maximum allowed requests per IP address within the window.
   * Defaults to 10 requests per minute.
   */
  maxIpRequests?: number;

  /**
   * Sliding window duration in milliseconds.
   * Defaults to 60,000 ms (1 minute).
   */
  windowMs?: number;

  /**
   * Whether valid coordinates are strictly required on this endpoint.
   * When true, requests missing coordinates are rejected with HTTP 400.
   * When false, requests missing coordinates fall back to IP rate limiting.
   */
  requireLocation?: boolean;

  /**
   * Namespace key prefix to distinguish endpoint rate limits (e.g., 'dealers', 'auth', 'orders').
   */
  keyPrefix?: string;
}

export interface CoordinateExtractionResult {
  status: 'VALID' | 'INVALID' | 'NONE';
  lat?: number;
  lng?: number;
  error?: string;
  source?: 'query' | 'body' | 'header';
}

/**
 * Extracts and normalizes the client IP address.
 * Respects proxy trust headers (X-Forwarded-For) when trust proxy is configured.
 */
export const extractClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first) {
      return normalizeIp(first);
    }
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0].trim();
    if (first) return normalizeIp(first);
  }

  const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return normalizeIp(rawIp);
};

const normalizeIp = (ip: string): string => {
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * Extracts geographical coordinates from query parameters, request body, or HTTP headers.
 */
export const extractCoordinates = (req: Request): CoordinateExtractionResult => {
  let rawLat: any = undefined;
  let rawLng: any = undefined;
  let source: 'query' | 'body' | 'header' = 'query';

  // 1. Query parameters (?lat=...&lng=... or ?latitude=...&longitude=...)
  if (req.query) {
    if (req.query.lat !== undefined && req.query.lng !== undefined) {
      rawLat = req.query.lat;
      rawLng = req.query.lng;
      source = 'query';
    } else if (req.query.latitude !== undefined && req.query.longitude !== undefined) {
      rawLat = req.query.latitude;
      rawLng = req.query.longitude;
      source = 'query';
    }
  }

  // 2. Request body ({ pickupCoordinates: [lng, lat] }, { coordinates: [lng, lat] }, or { lat, lng })
  if (rawLat === undefined && req.body && typeof req.body === 'object') {
    if (Array.isArray(req.body.pickupCoordinates) && req.body.pickupCoordinates.length === 2) {
      // GeoJSON standard: [longitude, latitude]
      rawLng = req.body.pickupCoordinates[0];
      rawLat = req.body.pickupCoordinates[1];
      source = 'body';
    } else if (Array.isArray(req.body.coordinates) && req.body.coordinates.length === 2) {
      rawLng = req.body.coordinates[0];
      rawLat = req.body.coordinates[1];
      source = 'body';
    } else if (req.body.lat !== undefined && req.body.lng !== undefined) {
      rawLat = req.body.lat;
      rawLng = req.body.lng;
      source = 'body';
    } else if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      rawLat = req.body.latitude;
      rawLng = req.body.longitude;
      source = 'body';
    }
  }

  // 3. HTTP Headers (X-Latitude, X-Longitude or X-Coordinates: "lat,lng")
  if (rawLat === undefined) {
    const headerLat = req.headers['x-latitude'] || req.headers['x-user-lat'];
    const headerLng = req.headers['x-longitude'] || req.headers['x-user-lng'];
    if (headerLat !== undefined && headerLng !== undefined) {
      rawLat = headerLat;
      rawLng = headerLng;
      source = 'header';
    } else if (req.headers['x-coordinates'] && typeof req.headers['x-coordinates'] === 'string') {
      const parts = req.headers['x-coordinates'].split(',');
      if (parts.length === 2) {
        rawLat = parts[0].trim();
        rawLng = parts[1].trim();
        source = 'header';
      }
    }
  }

  // No coordinates provided anywhere on the request
  if (rawLat === undefined || rawLng === undefined) {
    return { status: 'NONE' };
  }

  // Validate coordinates
  const validation = validateCoordinates(rawLat, rawLng);
  if (!validation.isValid) {
    return {
      status: 'INVALID',
      error: validation.error || 'Invalid geographical coordinates provided.',
      source,
    };
  }

  return {
    status: 'VALID',
    lat: validation.lat!,
    lng: validation.lng!,
    source,
  };
};

/**
 * Creates an Express middleware that enforces:
 * 1. IP-based rate limiting (Max 10 requests / minute)
 * 2. Location-based rate limiting using Geohash precision 6 (Max 20 requests / minute)
 * 3. Strict coordinate range and format validation
 * 4. 429 Too Many Requests response with standard user-friendly message
 */
export const createLocationAndIpRateLimiter = (
  options: LocationRateLimiterOptions = {}
): RequestHandler => {
  const maxLocationRequests = options.maxLocationRequests ?? config.locationRateLimitMax ?? 20;
  const maxIpRequests = options.maxIpRequests ?? config.ipRateLimitMax ?? 10;
  const windowMs = options.windowMs ?? config.rateLimitWindowMs ?? 60000;
  const requireLocation = options.requireLocation ?? false;
  const prefix = options.keyPrefix ? `:${options.keyPrefix}` : '';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIp = extractClientIp(req);

      // Always expose rate-limiting headers so browser DevTools and client apps can inspect them
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Retry-After, X-RateLimit-Limit-IP, X-RateLimit-Remaining-IP, X-RateLimit-Limit-Location, X-RateLimit-Remaining-Location, X-RateLimit-Geohash, X-RateLimit-Reset'
      );

      // 1. IP-Based Rate Limiting Check (Evaluated first to stop coordinate-rotation attacks)
      const ipKey = `rl:ip${prefix}:${clientIp}`;
      const ipRecord = await rateLimitStore.increment(ipKey, windowMs);

      res.setHeader('X-RateLimit-Limit-IP', maxIpRequests.toString());
      res.setHeader(
        'X-RateLimit-Remaining-IP',
        Math.max(0, maxIpRequests - ipRecord.totalHits).toString()
      );

      if (ipRecord.totalHits > maxIpRequests) {
        console.warn(
          `🚫 [RateLimiter] IP limit exceeded: ${clientIp} (${ipRecord.totalHits}/${maxIpRequests} req/min)`
        );
        const retryAfterSec = Math.max(1, Math.ceil((ipRecord.resetTime - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfterSec.toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(ipRecord.resetTime / 1000).toString());

        res.status(429).json({
          success: false,
          message: RATE_LIMIT_EXCEEDED_MESSAGE,
        });
        return;
      }

      // 2. Coordinate Extraction & Validation
      const coordResult = extractCoordinates(req);

      if (coordResult.status === 'INVALID') {
        res.status(400).json({
          success: false,
          message:
            'Invalid geographical coordinates provided. Latitude must be between -90 and 90, and longitude between -180 and 180.',
          detail: coordResult.error,
        });
        return;
      }

      if (coordResult.status === 'NONE') {
        if (requireLocation) {
          res.status(400).json({
            success: false,
            message: 'Geographical coordinates (latitude and longitude) are required for this service.',
          });
          return;
        }

        // Endpoint allows missing coordinates (e.g. web clients with location pending)
        // IP rate limit headers attached
        res.setHeader('X-RateLimit-Limit-IP', maxIpRequests.toString());
        res.setHeader(
          'X-RateLimit-Remaining-IP',
          Math.max(0, maxIpRequests - ipRecord.totalHits).toString()
        );
        return next();
      }

      // 3. Geohash Precision 6 Encoding (~1.2 km x 0.6 km geographical area)
      const geohash = encodeGeohash(coordResult.lat!, coordResult.lng!, 6);

      // Attach geohash to request object for downstream logging / telemetry
      (req as any).geohash = geohash;
      (req as any).validatedLocation = { lat: coordResult.lat, lng: coordResult.lng };

      // 4. Location-Based Rate Limiting Check
      const locationKey = `rl:geo${prefix}:${geohash}`;
      const locationRecord = await rateLimitStore.increment(locationKey, windowMs);

      res.setHeader('X-RateLimit-Limit-IP', maxIpRequests.toString());
      res.setHeader(
        'X-RateLimit-Remaining-IP',
        Math.max(0, maxIpRequests - ipRecord.totalHits).toString()
      );
      res.setHeader('X-RateLimit-Limit-Location', maxLocationRequests.toString());
      res.setHeader(
        'X-RateLimit-Remaining-Location',
        Math.max(0, maxLocationRequests - locationRecord.totalHits).toString()
      );
      res.setHeader('X-RateLimit-Geohash', geohash);

      console.log(
        `🛡️ [RateLimiter] IP: ${clientIp} (${ipRecord.totalHits}/${maxIpRequests}) | Geohash: ${geohash} (${locationRecord.totalHits}/${maxLocationRequests})`
      );

      if (locationRecord.totalHits > maxLocationRequests) {
        console.warn(
          `🚫 [RateLimiter] Location limit exceeded for Geohash ${geohash} (${locationRecord.totalHits}/${maxLocationRequests} req/min)`
        );
        const retryAfterSec = Math.max(1, Math.ceil((locationRecord.resetTime - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfterSec.toString());

        res.status(429).json({
          success: false,
          message: RATE_LIMIT_EXCEEDED_MESSAGE,
        });
        return;
      }

      return next();
    } catch (err) {
      // In case of unexpected limiter error, fail open to avoid service outage
      console.error('⚠️ [LocationRateLimiter] Error in rate limiter middleware:', err);
      return next();
    }
  };
};

/**
 * Pre-configured rate limiters for core Scrapwala APIs
 */

// 1. Nearby Dealers Discovery API (Max 10 req/IP/min, Max 20 req/Location/min)
export const nearbyDealersRateLimiter = createLocationAndIpRateLimiter({
  keyPrefix: 'dealers-nearby',
  maxLocationRequests: 20,
  maxIpRequests: 10,
  windowMs: 60000,
  requireLocation: true,
});

// 2. Authentication APIs (Send OTP & Verify OTP)
export const authRateLimiter = createLocationAndIpRateLimiter({
  keyPrefix: 'auth',
  maxLocationRequests: 20,
  maxIpRequests: 10,
  windowMs: 60000,
  requireLocation: false,
});

// 3. Scrap Pickup Booking Creation API
export const bookingRateLimiter = createLocationAndIpRateLimiter({
  keyPrefix: 'orders-create',
  maxLocationRequests: 20,
  maxIpRequests: 10,
  windowMs: 60000,
  requireLocation: true,
});

// 4. Default composite limiter
export const locationAndIpRateLimiter = createLocationAndIpRateLimiter();
