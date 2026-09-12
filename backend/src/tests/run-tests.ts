process.env.NODE_ENV = 'test';
import { connectDB, disconnectDB } from '../config/db.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { AuthService } from '../services/authService.js';
import { UserService } from '../services/userService.js';
import { DealerGatewayService } from '../services/dealerGatewayService.js';
import { OrderService } from '../services/orderService.js';
import { RatingService } from '../services/ratingService.js';

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

async function runTestSuite() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 RUNNING KABADIWALA CONSUMER BACKEND TEST SUITE');
  console.log('🧪 ========================================================\n');

  try {
    // 1. Connect DB
    await connectDB();

    // Register a test dealer snapshot for the test suite
    await DealerSnapshot.create({
      dealerId: 'DLR-TEST-001',
      businessName: 'GreenEarth Scrap Test Hub',
      contactPerson: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      rating: 4.9,
      totalRatings: 142,
      isAvailable: true,
      activeRadiusKm: 15,
      location: {
        type: 'Point',
        coordinates: [77.2150, 28.6250],
      },
      address: 'Plot 44, Recycling Estate, Barakhamba, New Delhi',
      vehicleType: 'Electric Mini Loader',
      vehicleNumber: 'DL-01-EV-9821',
      scrapRates: [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, minQuantityKg: 5, icon: 'newspaper' },
        { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, minQuantityKg: 5, icon: 'wrench' },
      ],
    });

    // 2. Test Auth Flow
    console.log('--- 1. Authentication & User Profile Tests ---');
    const phone = '+919988776655';
    const otpRes = await AuthService.requestOtp(phone);
    assert(!!otpRes.message, 'Send OTP responds with success message');

    const authRes = await AuthService.verifyOtpAndLogin(phone, '1234', 'Aman Verma');
    assert(!!authRes.accessToken, 'Verify OTP returns JWT Access Token');
    assert(authRes.user.phone === phone, 'User created with correct phone');
    assert(authRes.user.name === 'Aman Verma', 'User created with name');

    const userId = (authRes.user._id as any).toString();

    // 3. Test Location Management & Profile Update
    console.log('\n--- 2. Saved Locations & Profile Tests ---');
    const userWithLoc = await UserService.addSavedLocation(userId, {
      label: 'Home',
      address: 'House 42, Green Park Main, New Delhi',
      coordinates: [77.2020, 28.5600],
      isDefault: true,
    });
    assert((userWithLoc?.savedLocations?.length || 0) >= 1, 'Added saved location to user profile');

    const updatedProfile = await UserService.updateProfile(userId, {
      name: 'Aman V. Eco',
      profileImage: 'data:image/png;base64,sample-avatar',
      email: 'aman@example.com',
      isProfileCompleted: true,
    });
    assert(updatedProfile?.name === 'Aman V. Eco', 'Updated profile name');
    assert(updatedProfile?.profileImage === 'data:image/png;base64,sample-avatar', 'Updated profile image');
    assert(updatedProfile?.email === 'aman@example.com', 'Updated profile email');
    assert(updatedProfile?.isProfileCompleted === true, 'Marked profile as completed');

    // 4. Test Dealer Discovery
    console.log('\n--- 3. Dealer Discovery & Scrap Rates Tests ---');
    const nearbyDealers = await DealerGatewayService.getNearbyDealers(28.6250, 77.2150, 15);
    assert(nearbyDealers.length > 0, `Discovered ${nearbyDealers.length} nearby active dealers`);
    assert(nearbyDealers[0].distanceKm >= 0, 'Calculated distance in km to dealer');
    assert(nearbyDealers[0].scrapRates.length > 0, 'Dealer contains verified scrap rate catalogue');

    const selectedDealer = nearbyDealers[0];
    console.log(`  ℹ️ Selected Dealer: ${selectedDealer.businessName} (${selectedDealer.distanceKm} km away)`);

    // 5. Test Order Creation & State Machine
    console.log('\n--- 4. Order Creation & Strict State Machine Tests ---');
    const newOrder = await OrderService.createOrder(userId, {
      dealerId: selectedDealer.dealerId,
      pickupAddress: 'House 42, Green Park Main, New Delhi',
      pickupCoordinates: [77.2020, 28.5600],
      selectedMaterials: [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', estimatedWeightKg: 15 },
        { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', estimatedWeightKg: 10 },
      ],
      notes: 'Please bring digital weighing scale',
    });

    assert(newOrder.status === 'PENDING', 'New order starts in PENDING status');
    assert(!!newOrder.orderId && newOrder.orderId.startsWith('KBD-'), `Generated Order ID: ${newOrder.orderId}`);
    assert(!!newOrder.otp.code && newOrder.otp.code.length === 4, `Generated 4-digit pickup OTP: ${newOrder.otp.code}`);
    assert(newOrder.estimatedTotalAmount > 0, `Estimated scrap amount calculated: ₹${newOrder.estimatedTotalAmount}`);

    // Transition 1: ACCEPTED
    const acceptedOrder = await OrderService.transitionStatus(newOrder.orderId, 'ACCEPTED', {
      updatedBy: 'DEALER',
      note: 'Dealer accepted pickup booking',
    });
    assert(acceptedOrder.status === 'ACCEPTED', 'Status transitioned to ACCEPTED');

    // Transition 2: DEALER_EN_ROUTE
    const enRouteOrder = await OrderService.transitionStatus(newOrder.orderId, 'DEALER_EN_ROUTE', {
      updatedBy: 'DEALER',
      note: 'Dealer is en route on electric loader',
    });
    assert(enRouteOrder.status === 'DEALER_EN_ROUTE', 'Status transitioned to DEALER_EN_ROUTE');

    // Live GPS Update
    const locationUpdate = await OrderService.updateDealerLiveLocation(
      newOrder.orderId,
      [77.2100, 28.5800],
      45,
      22
    );
    assert(!!locationUpdate.dealerLiveLocation?.coordinates, 'Live GPS coordinates updated');

    // Transition 3: ARRIVED
    const arrivedOrder = await OrderService.transitionStatus(newOrder.orderId, 'ARRIVED', {
      updatedBy: 'DEALER',
      note: 'Dealer reached consumer pickup doorstep',
    });
    assert(arrivedOrder.status === 'ARRIVED', 'Status transitioned to ARRIVED');

    // Transition 4: OTP Verification
    const verifiedOrder = await OrderService.verifyPickupOtp(newOrder.orderId, newOrder.otp.code);
    assert(verifiedOrder.status === 'OTP_VERIFIED', 'Status transitioned to OTP_VERIFIED');
    assert(verifiedOrder.otp.isVerified === true, 'OTP marked as verified');

    // Transition 5: COMPLETED with final scrap weights
    const completedOrder = await OrderService.transitionStatus(newOrder.orderId, 'COMPLETED', {
      updatedBy: 'DEALER',
      note: 'Scrap weighed and payment settled',
      finalWeights: [
        { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, actualWeightKg: 18, finalAmount: 252 },
        { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, actualWeightKg: 12, finalAmount: 408 },
      ],
      finalTotalAmount: 660,
    });
    assert(completedOrder.status === 'COMPLETED', 'Status transitioned to COMPLETED');
    assert(completedOrder.finalTotalAmount === 660, `Final scrap amount recorded: ₹${completedOrder.finalTotalAmount}`);

    // 6. Test Rating Submission
    console.log('\n--- 5. Dealer Rating Tests ---');
    const rating = await RatingService.rateOrder(
      userId,
      newOrder.orderId,
      5,
      'Super fast pickup and accurate digital weighing scale!',
      ['Accurate Weighing', 'On Time', 'Polite']
    );
    assert(rating.score === 5, 'Recorded 5-star rating');
    assert(rating.tags.length === 3, 'Recorded feedback tags');

    // 7. Test Order History
    console.log('\n--- 6. Consumer Order History Tests ---');
    const history = await OrderService.getConsumerOrders(userId);
    assert(history.orders.length >= 1, `Order history contains ${history.orders.length} order(s)`);
    assert(history.orders[0].orderId === newOrder.orderId, 'Order history sorted by latest order');

    console.log('\n========================================================');
    console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================\n');

    await disconnectDB();

    if (passedTests === totalTests) {
      console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!\n');
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

runTestSuite();
