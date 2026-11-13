process.env.NODE_ENV = 'test';
import { connectDB, disconnectDB } from '../config/db.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { AuthService } from '../services/authService.js';
import { UserService } from '../services/userService.js';
import { DealerGatewayService } from '../services/dealerGatewayService.js';
import { OrderService } from '../services/orderService.js';
import { RatingService } from '../services/ratingService.js';
import { WalletService } from '../services/walletService.js';
import { StoreService } from '../services/storeService.js';
import { purgeDummyRecycledProducts } from '../utils/seedData.js';

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
      scrapPhoto: 'data:image/jpeg;base64,test_scrap_photo_base64',
      notes: 'Please bring digital weighing scale',
    });

    assert(newOrder.status === 'PENDING', 'New order starts in PENDING status');
    assert(!!newOrder.orderId && newOrder.orderId.startsWith('KBD-'), `Generated Order ID: ${newOrder.orderId}`);
    assert(!!newOrder.otp.code && newOrder.otp.code.length === 4, `Generated 4-digit pickup OTP: ${newOrder.otp.code}`);
    assert(newOrder.scrapPhoto === 'data:image/jpeg;base64,test_scrap_photo_base64', 'Scrap photo attached by consumer preserved in order');
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

    // 8. FEATURE 1: Scrap Rewards Wallet Tests
    console.log('\n--- 7. FEATURE 1: Scrap Rewards Wallet Tests ---');
    // Test conversion formula
    assert(WalletService.calculateScrapRewardCoins(100) === 10, '₹100 scrap deal = 10 reward coins');
    assert(WalletService.calculateScrapRewardCoins(250) === 25, '₹250 scrap deal = 25 reward coins');
    assert(WalletService.calculateScrapRewardCoins(500) === 50, '₹500 scrap deal = 50 reward coins');
    assert(WalletService.calculateScrapRewardCoins(1000) === 100, '₹1,000 scrap deal = 100 reward coins');
    assert(WalletService.calculateScrapRewardCoins(660) === 66, '₹660 scrap deal = 66 reward coins');

    // Verify wallet state after completed order
    const walletDashboard = await WalletService.getWalletDashboard(userId);
    assert(walletDashboard.wallet.availableCoins === 66, `Available reward coins credited: 66 (got: ${walletDashboard.wallet.availableCoins})`);
    assert(walletDashboard.wallet.lifetimeEarned === 66, `Lifetime coins earned recorded: 66 (got: ${walletDashboard.wallet.lifetimeEarned})`);
    assert(walletDashboard.wallet.lifetimeRedeemed === 0, `Total coins redeemed initialized to 0`);
    assert(walletDashboard.transactions.length >= 1, `Wallet transactions recorded: ${walletDashboard.transactions.length}`);

    const latestTx = walletDashboard.transactions[0];
    assert(latestTx.type === 'EARNED', `Transaction type is EARNED`);
    assert(latestTx.source === 'SCRAP_TRANSACTION', `Transaction source is SCRAP_TRANSACTION`);
    assert(latestTx.coins === 66, `Credited 66 coins for ₹660 deal`);
    assert(latestTx.referenceId === newOrder.orderId, `Reference ID matches completed order ID: ${newOrder.orderId}`);

    // Verify duplicate reward prevention (Idempotency)
    const duplicateAttempt = await WalletService.creditScrapReward(userId, newOrder.orderId, 660);
    assert(duplicateAttempt.alreadyCredited === true, 'Duplicate reward credit blocked by referenceId unique constraint');
    const walletAfterDuplicate = await WalletService.getOrCreateWallet(userId);
    assert(walletAfterDuplicate.availableCoins === 66, 'Wallet balance remained unchanged (66) after duplicate attempt');

    // 8. FEATURE 2: Recycled Store Tests
    console.log('\n--- 8. FEATURE 2: Recycled Store Dashboard Tests ---');
    await purgeDummyRecycledProducts();

    // 1. Verify dummy recyclers/products are purged
    const initialCatalog = await StoreService.getProducts({ page: 1, limit: 20 });
    assert(initialCatalog.products.length === 0, 'No dummy products or fake recyclers in database');

    // 2. Real registered recyclers list authentic products
    const recycler1 = await StoreService.listOrUpdateProduct({
      productId: 'REC-DEALER-001',
      recyclerId: 'DLR-TEST-001',
      recyclerName: 'GreenEarth Scrap & Recyclers',
      recyclerLocation: { address: 'Plot 4, Industrial Area', city: 'Bengaluru', rating: 4.9 },
      name: 'Upcycled Teakwood Industrial Coffee Table',
      description: 'Handcrafted coffee table engineered from salvaged shipyard teak wood.',
      category: 'Furniture',
      images: ['https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80'],
      originalPrice: 2499,
      discountedPrice: 1850,
      maxRewardCoins: 250,
      stock: 8,
      specifications: [{ key: 'Material', value: 'Reclaimed Teakwood' }],
    });
    assert(recycler1.productId === 'REC-DEALER-001', 'Registered recycler 1 listed product successfully');

    const recycler2 = await StoreService.listOrUpdateProduct({
      productId: 'REC-DEALER-002',
      recyclerId: 'DLR-TEST-002',
      recyclerName: 'Metro Plastic Solutions',
      recyclerLocation: { address: 'Electronic City Phase 1', city: 'Bengaluru', rating: 4.8 },
      name: 'Heavy Duty Recycled Plastic Garden Chair',
      description: 'Durable weather-proof ergonomic garden chair molded from recycled HDPE scrap.',
      category: 'Chairs & Tables',
      images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'],
      originalPrice: 850,
      discountedPrice: 620,
      maxRewardCoins: 100,
      stock: 12,
      specifications: [{ key: 'Material', value: '100% Recycled HDPE' }],
    });
    assert(recycler2.productId === 'REC-DEALER-002', 'Registered recycler 2 listed product successfully');

    // 3. Test getRecyclersWithProducts: Consumers see which recycler is selling what and at what price!
    const recyclersWithProds = await StoreService.getRecyclersWithProducts();
    assert(recyclersWithProds.length >= 2, `Fetched ${recyclersWithProds.length} registered recyclers`);
    assert(recyclersWithProds[0].productCount > 0, `Recycler displays active product count (${recyclersWithProds[0].productCount})`);
    assert(recyclersWithProds[0].products[0].discountedPrice > 0, `User can see at what price: ₹${recyclersWithProds[0].products[0].discountedPrice}`);

    // Category filter test
    const furnitureCatalog = await StoreService.getProducts({ category: 'Furniture' });
    assert(furnitureCatalog.products.length === 1, `Furniture category filter returned 1 product`);
    assert(furnitureCatalog.products[0].category === 'Furniture', `Item in category filter is Furniture`);

    // Search test
    const searchResult = await StoreService.getProducts({ search: 'Teakwood' });
    assert(searchResult.products.length >= 1, `Search by name 'Teakwood' returned matches`);

    // Product Details lookup
    const testProduct = recycler1;
    const productDetails = await StoreService.getProductById(testProduct.productId);
    assert(productDetails.name === testProduct.name, `Retrieved product details for ${productDetails.name}`);
    assert(productDetails.images.length >= 1, `Product includes multiple images`);
    assert(productDetails.recyclerName === 'GreenEarth Scrap & Recyclers', `Product displays registered recycler: ${productDetails.recyclerName}`);

    // Purchase product with reward coins redemption
    console.log('\n--- 9. Recycled Store Purchase with Coins Redemption Tests ---');
    const initialStock = productDetails.stock;
    const coinsToRedeem = 50; // Apply 50 coins for ₹50 discount
    const expectedFinalPrice = productDetails.discountedPrice - coinsToRedeem;

    const purchase = await StoreService.purchaseProduct(userId, {
      productId: productDetails.productId,
      coinsToRedeem,
      quantity: 1,
      paymentMethod: 'Cash on Delivery',
      shippingAddress: {
        name: 'Aman Verma',
        phone: '+919988776655',
        address: 'House 42, Green Park Main, New Delhi',
      },
    });

    assert(purchase.coinsRedeemed === coinsToRedeem, `Redeemed ${purchase.coinsRedeemed} reward coins`);
    assert(purchase.discountAmount === coinsToRedeem, `Applied ₹${purchase.discountAmount} reward discount`);
    assert(purchase.finalPricePaid === expectedFinalPrice, `Final price calculated: ₹${purchase.finalPricePaid} (Original: ₹${productDetails.discountedPrice} - ₹50)`);
    assert(purchase.remainingCoins === 16, `Remaining coins in wallet: 16 (66 - 50 = 16)`);

    // Verify stock decremented
    const updatedProduct = await StoreService.getProductById(testProduct.productId);
    assert(updatedProduct.stock === initialStock - 1, `Product stock decremented from ${initialStock} to ${updatedProduct.stock}`);

    // Verify wallet updated with redemption
    const updatedWallet = await WalletService.getWalletDashboard(userId);
    assert(updatedWallet.wallet.availableCoins === 16, `Available coins now 16`);
    assert(updatedWallet.wallet.lifetimeRedeemed === 50, `Lifetime redeemed updated to 50 coins`);

    const redemptionTx = updatedWallet.transactions[0];
    assert(redemptionTx.type === 'REDEEMED', `Redemption recorded with type REDEEMED`);
    assert(redemptionTx.coins === 50, `Redemption transaction recorded 50 coins`);

    // Test rejection when attempting to redeem more coins than available
    let overRedeemFailed = false;
    try {
      await StoreService.purchaseProduct(userId, {
        productId: productDetails.productId,
        coinsToRedeem: 1000, // User only has 16 coins
        quantity: 1,
        paymentMethod: 'Cash on Delivery',
        shippingAddress: {
          name: 'Aman Verma',
          phone: '+919988776655',
          address: 'House 42, Green Park Main, New Delhi',
        },
      });
    } catch (err: any) {
      overRedeemFailed = true;
    }
    assert(overRedeemFailed, 'Attempting to redeem more coins than available was rejected');

    // Test recycler adding new product reflects dynamically in marketplace
    const newRecyclerProduct = await StoreService.listOrUpdateProduct({
      recyclerId: 'REC-NEW-999',
      recyclerName: 'SolarClean Reclaimers',
      name: 'Upcycled Solar Battery Desk Lamp',
      description: 'Solar powered desk lamp made from reclaimed laptop lithium cells and brass fittings.',
      category: 'Home Decor',
      images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'],
      originalPrice: 1200,
      discountedPrice: 890,
      maxRewardCoins: 100,
      stock: 15,
      specifications: [{ key: 'Battery', value: 'Reclaimed 18650 Li-ion' }],
    });
    assert(!!newRecyclerProduct.productId, 'Recycler added new product successfully');

    const searchNew = await StoreService.getProducts({ search: 'SolarClean' });
    assert(searchNew.products.length >= 1, 'Newly added product by recycler immediately available in marketplace');

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
