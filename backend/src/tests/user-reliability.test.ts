import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { Order } from '../models/Order.js';
import { UserReliabilityService } from '../services/userReliabilityService.js';

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

export async function runUserReliabilityTests(): Promise<{ passed: number; total: number }> {
  console.log('\n--- 11. User Reliability, Rating & Anti-Spam Shield Tests ---');

  // 1. Initial State
  const testPhone = '+919911223344';
  await User.deleteOne({ phone: testPhone });
  const user = await User.create({
    phone: testPhone,
    name: 'Vikram Joshi',
    savedLocations: [
      {
        label: 'Home',
        address: '14, Palm Grove, Bengaluru',
        coordinates: [77.5946, 12.9716],
        isDefault: true,
      },
    ],
  });

  const userId = user._id.toString();

  assert(user.trustScore === 100, 'User starts with perfect 100 Trust Score');
  assert(user.starRating === 5.0, 'User starts with 5.0 Star Rating');
  assert(user.trustTier === 'EXCELLENT', 'User initial tier is EXCELLENT');
  assert(user.totalOrders === 0, 'Initial total orders is 0');
  assert(user.completedOrders === 0, 'Initial completed orders is 0');
  assert(user.cancelledOrders === 0, 'Initial cancelled orders is 0');

  // 2. Order Creation
  await UserReliabilityService.onOrderCreated(userId);
  let updated = (await User.findById(userId)) as IUser;
  assert(updated.totalOrders === 1, 'onOrderCreated increments totalOrders to 1');

  // 3. Order Completion Boost
  await UserReliabilityService.onOrderCompleted(userId);
  updated = (await User.findById(userId)) as IUser;
  assert(updated.completedOrders === 1, 'onOrderCompleted increments completedOrders to 1');
  assert(updated.trustScore === 100, 'Trust score capped at 100 maximum');
  assert(updated.starRating === 5.0, 'Star rating maintained at 5.0 after completion');
  assert(updated.cancellationRate === 0, 'Cancellation rate is 0%');

  // 4. Early Cancellation (PENDING) - Mild Penalty (-4 pts)
  await UserReliabilityService.onOrderCreated(userId);
  await UserReliabilityService.onOrderCancelled(userId, 'KBD-TEST-001', 'PENDING', 'Changed mind');
  updated = (await User.findById(userId)) as IUser;
  assert(updated.cancelledOrders === 1, 'cancelledOrders incremented to 1');
  assert(updated.trustScore === 96, 'Early cancellation applies mild penalty: 100 - 4 = 96 pts');
  assert(updated.cancellationRate === 50, 'Cancellation rate updated to 50% (1 cancel / 2 total)');
  assert(updated.trustTier === 'EXCELLENT', 'Trust tier remains EXCELLENT (>= 85)');

  // 5. Mid-Route Cancellation (DEALER_EN_ROUTE) - Severe Penalty (-18 pts)
  await UserReliabilityService.onOrderCreated(userId);
  await UserReliabilityService.onOrderCancelled(userId, 'KBD-TEST-002', 'DEALER_EN_ROUTE', 'Emergency came up');
  updated = (await User.findById(userId)) as IUser;
  assert(updated.cancelledOrders === 2, 'cancelledOrders incremented to 2');
  assert(updated.trustScore === 78, 'Mid-route cancellation penalty: 96 - 18 = 78 pts');
  assert(updated.trustTier === 'GOOD', 'Trust tier dropped to GOOD (70-84 pts)');
  assert(updated.trustScore === 78, 'Trust score dropped to 78 pts after mid-route cancel');

  // 6. Rapid Cancellation Spam Detection (Triggers 15-minute booking cooldown)
  // Two en-route cancellations within 1 hour trigger the anti-spam freeze
  assert(
    updated.bookingCooldownUntil !== null && updated.bookingCooldownUntil !== undefined,
    'Booking cooldown triggered after repeated / mid-route cancellations'
  );
  const isCooldownFuture =
    updated.bookingCooldownUntil && new Date(updated.bookingCooldownUntil) > new Date();
  assert(Boolean(isCooldownFuture), 'Cooldown timestamp is set into the future (15 minutes)');

  // 7. Booking Attempt During Cooldown is Blocked
  let cooldownBlocked = false;
  let cooldownMessage = '';
  try {
    await UserReliabilityService.checkBookingEligibility(userId);
  } catch (err: any) {
    cooldownBlocked = true;
    cooldownMessage = err.message;
  }
  assert(cooldownBlocked === true, 'Booking eligibility check blocks user during active cooldown');
  assert(
    cooldownMessage.includes('temporarily paused'),
    'Cooldown error contains clear explanatory policy message for user'
  );

  // 8. Cooldown Expiry & Recovery via Completion
  // Simulate cooldown expiry
  updated.bookingCooldownUntil = null;
  await updated.save();

  // 9. Concurrent Booking Flooding Lock Test
  // Create an active in-progress order for the user
  await Order.create({
    orderId: 'KBD-ACTIVE-SPAM-001',
    consumerId: new mongoose.Types.ObjectId(userId),
    dealerId: 'DLR-TEST-001',
    dealerSnapshot: {
      businessName: 'GreenEarth Scrap Hub',
      contactPerson: 'Ramesh',
      phone: '+919876543210',
    },
    pickupAddress: '14, Palm Grove, Bengaluru',
    pickupLocation: { type: 'Point', coordinates: [77.5946, 12.9716] },
    selectedMaterials: [],
    dealerPricesSnapshot: [],
    estimatedTotalAmount: 300,
    status: 'DEALER_EN_ROUTE',
    statusHistory: [{ status: 'DEALER_EN_ROUTE', timestamp: new Date() }],
    otp: { code: '1234', expiresAt: new Date(Date.now() + 3600000), isVerified: false },
    chatMessages: [],
    rated: false,
  });

  let concurrentBlocked = false;
  let concurrentMsg = '';
  try {
    await UserReliabilityService.checkBookingEligibility(userId);
  } catch (err: any) {
    concurrentBlocked = true;
    concurrentMsg = err.message;
  }
  assert(concurrentBlocked === true, 'Concurrent order lock blocks booking another dealer while one is in progress');
  assert(
    concurrentMsg.includes('already have an active scrap pickup order in progress'),
    'Concurrent block error informs user of existing active order'
  );

  // Clean up test active order
  await Order.deleteOne({ orderId: 'KBD-ACTIVE-SPAM-001' });

  // 10. Dealer Rating of Consumer (Two-Way Rating)
  await UserReliabilityService.addDealerRatingToConsumer(userId, {
    dealerId: 'DLR-RAMESH-001',
    dealerName: 'Ramesh Verma',
    dealerBusinessName: 'GreenEarth Scrap Hub',
    score: 4,
    feedback: 'Great seller, scrap was segregated and ready',
    tags: ['Accurate Weight', 'Punctual & Responsive'],
    orderId: 'ORD-TEST-REV-001',
  });
  updated = (await User.findById(userId)) as IUser;
  assert(updated.dealerRatingsCount === 1, 'Dealer rating recorded for consumer');
  assert(updated.dealerRatingsTotal === 4, 'Dealer rating total is 4');
  assert(updated.starRating === 4.0, 'Consumer star rating updated directly to 4.0 from dealer review');
  assert(updated.dealerReviews.length === 1, 'Dealer review stored in consumer dealerReviews array');
  assert(
    updated.dealerReviews[0].dealerBusinessName === 'GreenEarth Scrap Hub',
    'Dealer business hub name preserved in review'
  );

  // 11. Full Reliability Report Generation
  const report = await UserReliabilityService.getUserReliabilityReport(userId);
  assert(report !== null, 'Reliability report generated successfully');
  assert(report?.userId === userId, 'Report matches target user ID');
  assert(typeof report?.trustScore === 'number', 'Report contains numeric trust score');
  assert(report?.starRating === 4.0, 'Report contains updated dealer star rating (4.0)');
  assert(report?.dealerReviews.length === 1, 'Report includes full dealer reviews list for profile');
  assert(report?.tierLabel.length! > 0, 'Report includes user-friendly tier label');
  assert(report?.policyGuidelines.length === 4, 'Report includes clear fair-use policy guidelines');

  // Clean up
  await User.deleteOne({ phone: testPhone });

  return { passed: passedTests, total: totalTests };
}
