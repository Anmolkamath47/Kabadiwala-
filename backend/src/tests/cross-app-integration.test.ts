import axios from 'axios';

const KABADIWALA_API = process.env.KABADIWALA_API_URL || 'http://localhost:5000/api';
const KABADIDEALER_API = process.env.KABADIDEALER_API_URL || 'http://localhost:5001/api';

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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCrossAppIntegrationTests() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 CROSS-APPLICATION INTEGRATION TEST SUITE');
  console.log('🧪 Kabadiwala Consumer API ⟷ Kabadidealer Partner API');
  console.log('🧪 ========================================================\n');

  try {
    // Setup 1: Authenticate Consumer on Kabadiwala Backend
    console.log('--- Setup: Consumer & Dealer Authentication ---');
    const consumerPhone = '+919876500001';
    await axios.post(`${KABADIWALA_API}/auth/send-otp`, { phone: consumerPhone });
    const consumerAuthRes = await axios.post(`${KABADIWALA_API}/auth/verify-otp`, {
      phone: consumerPhone,
      otp: '1234',
      name: 'Rohan Sharma',
    });
    const consumerToken = consumerAuthRes.data.data.accessToken;
    const consumerHeaders = { Authorization: `Bearer ${consumerToken}` };
    assert(!!consumerToken, 'Consumer authenticated on Kabadiwala API');

    // Setup 2: Authenticate Dealer on Kabadidealer Backend (Ramesh Kumar - 9876543210)
    const dealerPhone = '9876543210';
    await axios.post(`${KABADIDEALER_API}/auth/send-otp`, { phone: dealerPhone });
    const dealerAuthRes = await axios.post(`${KABADIDEALER_API}/auth/verify-otp`, {
      phone: dealerPhone,
      otp: '1234',
    });
    const dealerToken = dealerAuthRes.data.data.accessToken;
    const targetDealerId = dealerAuthRes.data.data.dealer.dealerId;
    const dealerHeaders = { Authorization: `Bearer ${dealerToken}` };
    assert(!!dealerToken, `Dealer authenticated on Kabadidealer API (${targetDealerId})`);

    // Ensure Dealer is Online
    await axios.patch(
      `${KABADIDEALER_API}/dealers/status`,
      { isOnline: true },
      { headers: dealerHeaders }
    );

    // ========================================================
    // 1. Fetch active nearby dealers
    // ========================================================
    console.log('\n--- 1. Fetch Active Nearby Dealers ---');
    const nearbyRes = await axios.get(`${KABADIWALA_API}/dealers/nearby`, {
      params: { lat: 28.6250, lng: 77.2150, radius: 15 },
    });
    assert(nearbyRes.status === 200, 'Kabadiwala /dealers/nearby returns HTTP 200');
    assert(
      nearbyRes.data.data.dealers.length >= 1,
      `Discovered ${nearbyRes.data.data.dealers.length} active dealers live from Kabadidealer`
    );

    const activeDealer = nearbyRes.data.data.dealers.find(
      (d: any) => d.dealerId === targetDealerId
    ) || nearbyRes.data.data.dealers[0];
    assert(!!activeDealer.dealerId, `Target Dealer Selected: ${activeDealer.businessName} (${activeDealer.dealerId})`);

    // ========================================================
    // 2. Fetch dealer material prices
    // ========================================================
    console.log('\n--- 2. Fetch Dealer Material Prices ---');
    const pricesRes = await axios.get(`${KABADIWALA_API}/dealers/${activeDealer.dealerId}`);
    assert(pricesRes.status === 200, 'Kabadiwala /dealers/:dealerId returns HTTP 200');
    assert(
      Array.isArray(pricesRes.data.data.scrapRates) && pricesRes.data.data.scrapRates.length > 0,
      `Retrieved ${pricesRes.data.data.scrapRates?.length} verified scrap material rates for dealer`
    );

    // ========================================================
    // 3. Create pickup booking
    // ========================================================
    console.log('\n--- 3. Create Pickup Booking (Consumer) ---');
    const createOrderRes = await axios.post(
      `${KABADIWALA_API}/orders`,
      {
        dealerId: activeDealer.dealerId,
        pickupAddress: 'Flat 302, Connaught Mansions, New Delhi',
        pickupCoordinates: [77.2150, 28.6250],
        selectedMaterials: [
          {
            category: 'Paper',
            name: 'Newspaper (Raddi)',
            unit: 'kg',
            estimatedWeightKg: 15,
          },
          {
            category: 'Metal',
            name: 'Iron / Steel Scrap (Loha)',
            unit: 'kg',
            estimatedWeightKg: 10,
          },
        ],
        notes: 'Please call before arrival',
      },
      { headers: consumerHeaders }
    );

    assert(createOrderRes.status === 201, 'Booking created successfully with HTTP 201');
    const createdOrder = createOrderRes.data.data;
    const orderId = createdOrder.orderId;
    const otpCode = createdOrder.otp.code;
    assert(createdOrder.status === 'PENDING', 'Order starts in PENDING status on Kabadiwala');
    assert(!!otpCode && otpCode.length === 4, `Order generated 4-digit pickup OTP: ${otpCode}`);

    // ========================================================
    // 4. Notify dealer
    // ========================================================
    console.log('\n--- 4. Verify Dealer Notification in Kabadidealer ---');
    // Allow asynchronous HTTP post and Socket event propagation
    await sleep(600);

    const dealerOrderRes = await axios.get(`${KABADIDEALER_API}/orders/${orderId}`, {
      headers: dealerHeaders,
    });
    assert(dealerOrderRes.status === 200, 'Kabadidealer received order via REST webhook');
    assert(dealerOrderRes.data.data.orderId === orderId, 'Order ID matches in Kabadidealer DB');
    assert(dealerOrderRes.data.data.status === 'PENDING', 'Kabadidealer order is PENDING dealer acceptance');

    // ========================================================
    // 5. Receive dealer acceptance
    // ========================================================
    console.log('\n--- 5. Dealer Acceptance Synchronized to Kabadiwala ---');
    const acceptRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/accept`,
      {},
      { headers: dealerHeaders }
    );
    assert(acceptRes.status === 200, 'Dealer accepted order on Kabadidealer');

    await sleep(600);

    const consumerOrderAfterAccept = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      consumerOrderAfterAccept.data.data.status === 'ACCEPTED',
      'Kabadiwala received ACCEPTED status transition webhook from Kabadidealer'
    );

    // ========================================================
    // 6. Receive dealer status updates (DEALER_EN_ROUTE & ARRIVED)
    // ========================================================
    console.log('\n--- 6. Dealer Status Updates (EN ROUTE & ARRIVED) ---');
    // Start trip
    await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/start-trip`,
      {},
      { headers: dealerHeaders }
    );
    await sleep(600);

    const consumerOrderEnRoute = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      consumerOrderEnRoute.data.data.status === 'DEALER_EN_ROUTE',
      'Kabadiwala updated to DEALER_EN_ROUTE'
    );

    // Mark arrived
    await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/arrived`,
      {},
      { headers: dealerHeaders }
    );
    await sleep(600);

    const consumerOrderArrived = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      consumerOrderArrived.data.data.status === 'ARRIVED',
      'Kabadiwala updated to ARRIVED at customer doorstep'
    );

    // ========================================================
    // 7. Receive live dealer location
    // ========================================================
    console.log('\n--- 7. Receive Live Dealer GPS Location ---');
    await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/location`,
      {
        coordinates: [77.2140, 28.6245],
        heading: 85,
        speed: 24,
      },
      { headers: dealerHeaders }
    );
    await sleep(600);

    const consumerOrderGps = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      !!consumerOrderGps.data.data.dealerLiveLocation?.coordinates,
      'Live dealer GPS location streamed and recorded on Kabadiwala order'
    );
    assert(
      consumerOrderGps.data.data.dealerLiveLocation.coordinates[0] === 77.2140,
      'GPS Longitude coordinate matches accurately'
    );

    // ========================================================
    // 8. Receive OTP verification result
    // ========================================================
    console.log('\n--- 8. Receive Doorstep OTP Verification Result ---');
    const verifyOtpRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/verify-otp`,
      { otp: otpCode },
      { headers: dealerHeaders }
    );
    assert(verifyOtpRes.status === 200, 'Kabadidealer successfully verified 4-digit OTP');

    await sleep(600);

    const consumerOrderOtpVerified = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      consumerOrderOtpVerified.data.data.status === 'OTP_VERIFIED',
      'Kabadiwala received OTP_VERIFIED state transition'
    );
    assert(
      consumerOrderOtpVerified.data.data.otp.isVerified === true,
      'Consumer order marked as OTP verified'
    );

    // ========================================================
    // 9. Receive completed order
    // ========================================================
    console.log('\n--- 9. Receive Completed Order & Final Weighment Settlement ---');
    const completeRes = await axios.post(
      `${KABADIDEALER_API}/orders/${orderId}/complete`,
      {
        finalWeights: [
          {
            category: 'Paper',
            name: 'Newspaper (Raddi)',
            unit: 'kg',
            pricePerKg: 14,
            actualWeightKg: 18,
            finalAmount: 252,
          },
          {
            category: 'Metal',
            name: 'Iron / Steel Scrap (Loha)',
            unit: 'kg',
            pricePerKg: 34,
            actualWeightKg: 12,
            finalAmount: 408,
          },
        ],
        finalTotalAmount: 660,
      },
      { headers: dealerHeaders }
    );
    assert(completeRes.status === 200, 'Dealer completed order on Kabadidealer');

    await sleep(600);

    const consumerOrderCompleted = await axios.get(`${KABADIWALA_API}/orders/${orderId}`, {
      headers: consumerHeaders,
    });
    assert(
      consumerOrderCompleted.data.data.status === 'COMPLETED',
      'Kabadiwala received COMPLETED status transition from dealer'
    );
    assert(
      consumerOrderCompleted.data.data.finalTotalAmount === 660,
      `Final payout recorded accurately: ₹${consumerOrderCompleted.data.data.finalTotalAmount}`
    );
    assert(
      consumerOrderCompleted.data.data.finalWeights.length === 2,
      'Itemized digital scale weighments recorded on consumer receipt'
    );

    // ========================================================
    // 10. Submit consumer rating
    // ========================================================
    console.log('\n--- 10. Submit Consumer Rating to Dealer ---');
    const ratingRes = await axios.post(
      `${KABADIWALA_API}/ratings`,
      {
        orderId,
        score: 5,
        feedback: 'Fantastic service! Extremely punctual and transparent digital weighing scale.',
        tags: ['Accurate Weighing', 'On Time', 'Polite Partner'],
      },
      { headers: consumerHeaders }
    );
    assert(ratingRes.status === 201, 'Consumer submitted rating on Kabadiwala');

    await sleep(600);

    // Verify rating reflected in Kabadidealer profile
    const dealerProfileRes = await axios.get(`${KABADIDEALER_API}/dealers/${activeDealer.dealerId}`);
    assert(dealerProfileRes.status === 200, 'Fetched updated dealer profile from Kabadidealer');
    assert(
      dealerProfileRes.data.data.totalRatings >= 1,
      `Dealer total ratings count updated to: ${dealerProfileRes.data.data.totalRatings}`
    );

    console.log('\n========================================================');
    console.log(`📊 INTEGRATION TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL 10 INTEGRATION REQUIREMENTS VERIFIED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Integration test execution failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runCrossAppIntegrationTests();
