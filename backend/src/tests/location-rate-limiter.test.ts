import http from 'http';
import axios, { AxiosInstance } from 'axios';
import app from '../app.js';
import { rateLimitStore } from '../utils/rateLimitStore.js';
import { encodeGeohash, validateCoordinates } from '../utils/geo.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';

let passedTests = 0;
let totalTests = 0;

const assert = (condition: boolean, testName: string, detail?: string) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
};

export async function runLocationRateLimiterTests(): Promise<{ passed: number; total: number }> {
  console.log('\n--- 10. Location-Based and IP Rate Limiting Tests ---');

  // Start test HTTP server on random available port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const client: AxiosInstance = axios.create({
    baseURL: `http://127.0.0.1:${port}/api`,
    validateStatus: () => true, // Don't throw on 4xx/5xx status
  });

  try {
    // Ensure test dealer exists for nearby queries
    await DealerSnapshot.findOneAndUpdate(
      { dealerId: 'DLR-TEST-001' },
      {
        dealerId: 'DLR-TEST-001',
        businessName: 'GreenEarth Scrap Hub',
        contactPerson: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        rating: 4.8,
        totalRatings: 42,
        isAvailable: true,
        isOnline: true,
        address: 'MG Road, Bangalore',
        vehicleType: 'Tata Ace',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
        scrapRates: [
          { category: 'Paper', name: 'Newspaper', unit: 'kg', pricePerKg: 14 },
          { category: 'Metal', name: 'Iron Scrap', unit: 'kg', pricePerKg: 32 },
        ],
      },
      { upsert: true }
    );

    // =========================================================================
    // Unit Verification: Geohash Precision 6 Algorithm & Coordinate Validation
    // =========================================================================
    const blrGeohash = encodeGeohash(12.9716, 77.5946, 6);
    assert(blrGeohash.length === 6, 'Geohash precision 6 outputs exactly 6 characters');
    assert(blrGeohash === 'tdr1v9', 'Bangalore coordinates resolve to standard geohash tdr1v9');

    const delGeohash = encodeGeohash(28.6139, 77.2090, 6);
    assert(delGeohash === 'ttnfuc', 'Delhi coordinates resolve to standard geohash ttnfuc');
    assert(blrGeohash !== delGeohash, 'Different cities produce distinct geohashes');

    const validCheck = validateCoordinates(12.9716, 77.5946);
    assert(validCheck.isValid === true, 'Coordinates within range [-90,90] [-180,180] marked valid');

    const invalidLat = validateCoordinates(95.5, 77.5946);
    assert(invalidLat.isValid === false, 'Latitude > 90 rejected');

    const invalidLng = validateCoordinates(12.9716, -185);
    assert(invalidLng.isValid === false, 'Longitude < -180 rejected');

    // =========================================================================
    // Scenario 1: Requests within the limit should work normally
    // =========================================================================
    await rateLimitStore.reset();
    const testIp1 = '198.51.100.1';
    let s1SuccessCount = 0;

    for (let i = 0; i < 5; i++) {
      const res = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
        headers: { 'x-forwarded-for': testIp1 },
      });
      if (res.status === 200 && res.data.success) {
        s1SuccessCount++;
      }
      if (i === 0) {
        assert(res.headers['x-ratelimit-geohash'] === 'tdr1v9', 'First request contains X-RateLimit-Geohash: tdr1v9');
        assert(res.headers['x-ratelimit-limit-location'] === '20', 'First request contains X-RateLimit-Limit-Location: 20');
        assert(res.headers['x-ratelimit-remaining-location'] === '19', 'First request contains X-RateLimit-Remaining-Location: 19');
        assert(res.headers['x-ratelimit-limit-ip'] === '10', 'First request contains X-RateLimit-Limit-IP: 10');
        assert(res.headers['x-ratelimit-remaining-ip'] === '9', 'First request contains X-RateLimit-Remaining-IP: 9');
        assert(!!res.headers['access-control-expose-headers'], 'Response contains Access-Control-Expose-Headers for CORS browsers');
      }
    }
    assert(s1SuccessCount === 5, 'Requests within IP & Location limit succeed with HTTP 200');

    // =========================================================================
    // Scenario 2: The 21st request from same geographical area rejected (429)
    // =========================================================================
    await rateLimitStore.reset();
    const blrLat = 12.9716;
    const blrLng = 77.5946;

    // Send 10 requests from IP A in Bangalore (within IP limit 10)
    for (let i = 0; i < 10; i++) {
      const res = await client.get(`/dealers/nearby?lat=${blrLat}&lng=${blrLng}`, {
        headers: { 'x-forwarded-for': '198.51.100.10' },
      });
      assert(res.status === 200, `Request #${i + 1} from IP A in Bangalore succeeds (200)`);
    }

    // Send 10 requests from IP B in Bangalore (within IP limit 10, brings location total to 20)
    for (let i = 0; i < 10; i++) {
      const res = await client.get(`/dealers/nearby?lat=${blrLat}&lng=${blrLng}`, {
        headers: { 'x-forwarded-for': '198.51.100.11' },
      });
      assert(res.status === 200, `Request #${i + 1} from IP B in Bangalore succeeds (200)`);
    }

    // Now location Bangalore has reached 20 requests in 1 minute.
    // The 21st request comes from IP C in the same location:
    const res21 = await client.get(`/dealers/nearby?lat=${blrLat}&lng=${blrLng}`, {
      headers: { 'x-forwarded-for': '198.51.100.12' },
    });

    assert(res21.status === 429, '21st request from same geographical area is rejected with HTTP 429');
    assert(
      res21.data.message === 'Due to high traffic, please wait a few moments and try again.',
      '429 response contains exact user-friendly high traffic message'
    );
    assert(!!res21.headers['retry-after'], '429 response includes standard Retry-After header');

    // =========================================================================
    // Scenario 3: Requests exceeding IP limit (10 req/min) should be rejected
    // =========================================================================
    await rateLimitStore.reset();
    const testIpSolo = '198.51.100.50';

    // Send 10 requests from single IP
    for (let i = 0; i < 10; i++) {
      const res = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
        headers: { 'x-forwarded-for': testIpSolo },
      });
      assert(res.status === 200, `Single IP request #${i + 1} accepted within limit (200)`);
    }

    // 11th request from same IP should be blocked by IP rate limiter
    const res11Ip = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
      headers: { 'x-forwarded-for': testIpSolo },
    });
    assert(res11Ip.status === 429, '11th request exceeding IP limit is rejected with HTTP 429');
    assert(
      res11Ip.data.message === 'Due to high traffic, please wait a few moments and try again.',
      'IP rate limit uses standard user-friendly message'
    );

    // =========================================================================
    // Scenario 4: Invalid GPS coordinates should not bypass rate limiter
    // =========================================================================
    await rateLimitStore.reset();
    const attackerIp = '198.51.100.99';

    // Invalid latitude (out of bounds)
    const invalidRes1 = await client.get('/dealers/nearby?lat=999.0&lng=77.5946', {
      headers: { 'x-forwarded-for': attackerIp },
    });
    assert(invalidRes1.status === 400, 'Invalid latitude (>90) is rejected with HTTP 400');
    assert(
      invalidRes1.data.message.includes('Invalid geographical coordinates'),
      'Invalid coordinate response gives clear rejection message'
    );

    // Invalid longitude (out of bounds)
    const invalidRes2 = await client.get('/dealers/nearby?lat=12.9716&lng=-500.0', {
      headers: { 'x-forwarded-for': attackerIp },
    });
    assert(invalidRes2.status === 400, 'Invalid longitude (<-180) is rejected with HTTP 400');

    // Non-numeric coordinates
    const invalidRes3 = await client.get('/dealers/nearby?lat=abc&lng=xyz', {
      headers: { 'x-forwarded-for': attackerIp },
    });
    assert(invalidRes3.status === 400, 'Non-numeric coordinates rejected with HTTP 400');

    // Verify invalid coordinate spam still counts against IP rate limiter
    // (Attacker made 3 attempts above, let's make 7 more invalid attempts)
    for (let i = 0; i < 7; i++) {
      await client.get('/dealers/nearby?lat=999&lng=999', {
        headers: { 'x-forwarded-for': attackerIp },
      });
    }
    // 11th request from attacker should trigger 429 (cannot bypass IP limiter via invalid coords)
    const attackerBannedRes = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
      headers: { 'x-forwarded-for': attackerIp },
    });
    assert(attackerBannedRes.status === 429, 'Attacker spamming invalid coords hits IP 429 limit');

    // =========================================================================
    // Scenario 5: Different geographical areas have separate location counters
    // =========================================================================
    await rateLimitStore.reset();

    // Fill Bangalore location counter to 20
    for (let i = 0; i < 10; i++) {
      await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
        headers: { 'x-forwarded-for': '198.51.100.101' },
      });
      await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
        headers: { 'x-forwarded-for': '198.51.100.102' },
      });
    }

    // Verify Bangalore is now rate-limited
    const blrBlocked = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
      headers: { 'x-forwarded-for': '198.51.100.103' },
    });
    assert(blrBlocked.status === 429, 'Bangalore geohash (tdr1v9) is rate-limited at 20 requests');

    // Delhi request from another IP should SUCCEED because Delhi is a distinct geohash (ttnfuc)
    const delhiRes = await client.get('/dealers/nearby?lat=28.6139&lng=77.2090', {
      headers: { 'x-forwarded-for': '198.51.100.104' },
    });
    assert(delhiRes.status === 200, 'Delhi request succeeds independently despite Bangalore limit reached');
    assert(delhiRes.headers['x-ratelimit-geohash'] === 'ttnfuc', 'Response header confirms distinct Delhi geohash ttnfuc');

    // =========================================================================
    // Scenario 6: Normal Booking, Dealer Discovery & Auth Continue Working
    // =========================================================================
    await rateLimitStore.reset();
    const normalIp = '198.51.100.200';

    // 1. Auth Send OTP
    const sendOtpRes = await client.post(
      '/auth/send-otp',
      { phone: '+919988771122' },
      { headers: { 'x-forwarded-for': normalIp } }
    );
    assert(sendOtpRes.status === 200, 'Normal Send-OTP API functions smoothly with rate limiter');

    // 2. Auth Verify OTP
    const verifyOtpRes = await client.post(
      '/auth/verify-otp',
      { phone: '+919988771122', otp: '1234', name: 'RateLimit Test User' },
      { headers: { 'x-forwarded-for': normalIp } }
    );
    assert(verifyOtpRes.status === 200, 'Normal Verify-OTP API functions smoothly with rate limiter');
    const token = verifyOtpRes.data.data?.accessToken;
    assert(!!token, 'Auth returns valid JWT access token');

    // 3. Nearby Dealer Discovery
    const nearbyRes = await client.get('/dealers/nearby?lat=12.9716&lng=77.5946', {
      headers: { 'x-forwarded-for': normalIp },
    });
    assert(nearbyRes.status === 200, 'Dealer discovery endpoint returns 200 OK');

    // 4. Booking API (POST /api/orders) with pickupCoordinates: [lng, lat]
    const orderRes = await client.post(
      '/orders',
      {
        dealerId: 'DLR-TEST-001',
        pickupAddress: 'Indiranagar 100ft Road, Bangalore - 560038',
        pickupCoordinates: [77.6412, 12.9784],
        selectedMaterials: [
          { category: 'Paper', name: 'Newspaper', unit: 'kg', estimatedWeightKg: 10 },
        ],
      },
      {
        headers: {
          'x-forwarded-for': normalIp,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    assert(orderRes.status === 201, 'Booking API creates order successfully with HTTP 201');
    assert(orderRes.data.success === true, 'Order created with valid state');
  } finally {
    await rateLimitStore.reset();
    server.close();
  }

  return { passed: passedTests, total: totalTests };
}

// Allow standalone execution: npx tsx src/tests/location-rate-limiter.test.ts
if (process.argv[1]?.includes('location-rate-limiter.test.ts')) {
  (async () => {
    try {
      const { connectDB, disconnectDB } = await import('../config/db.js');
      await connectDB();
      const results = await runLocationRateLimiterTests();
      console.log(`\nLocation Rate Limiter Test Results: ${results.passed}/${results.total} PASSED\n`);
      await disconnectDB();
      process.exit(results.passed === results.total ? 0 : 1);
    } catch (e: any) {
      console.error('Test execution failed:', e);
      process.exit(1);
    }
  })();
}
