import mongoose from 'mongoose';
import { Order, IOrder } from '../models/Order.js';
import { DealerSnapshot } from '../models/DealerSnapshot.js';
import { User } from '../models/User.js';
import { DealerGatewayService } from './dealerGatewayService.js';
import { generateOrderOtp } from '../utils/otp.js';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo.js';
import { socketEvents } from '../sockets/socketManager.js';
import {
  OrderStatus,
  SelectedMaterialItem,
  FinalWeightItem,
  DealerLiveLocationUpdate,
} from '../types/index.js';

// Strict State Transition Map
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED', 'REJECTED'],
  ACCEPTED: ['DEALER_EN_ROUTE', 'CANCELLED'],
  DEALER_EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['OTP_PENDING', 'OTP_VERIFIED'],
  OTP_PENDING: ['OTP_VERIFIED'],
  OTP_VERIFIED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export class OrderService {
  /**
   * Helper to generate human-readable unique order ID (e.g. KBD-20260910-8912)
   */
  private static generateOrderId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `KBD-${dateStr}-${randomSuffix}`;
  }

  /**
   * Create a new scrap pickup order
   */
  static async createOrder(
    consumerId: string,
    data: {
      dealerId: string;
      pickupAddress: string;
      pickupCoordinates: [number, number]; // [lng, lat]
      selectedMaterials: Array<{
        category: any;
        name: string;
        unit: 'kg' | 'piece';
        estimatedWeightKg: number;
      }>;
      notes?: string;
    }
  ): Promise<IOrder> {
    // 1. Fetch dealer snapshot via DealerGatewayService (HTTP to Kabadidealer with local fallback)
    const dealer = await DealerGatewayService.getDealerById(data.dealerId);
    if (!dealer) {
      throw new Error(`Dealer with ID ${data.dealerId} not found.`);
    }

    if (dealer.isOnline === false) {
      throw new Error('This scrap dealer is currently offline (Off Duty) and not accepting new pickup orders.');
    }

    // 2. Validate and calculate estimated scrap value from dealer's verified price snapshot
    let totalEstimatedAmount = 0;
    const materialsWithPrices: SelectedMaterialItem[] = [];

    for (const item of data.selectedMaterials) {
      // Find matching item in dealer rates or default category rate
      const rateObj =
        (dealer.scrapRates || []).find(
          (r: any) => r.name.toLowerCase() === item.name.toLowerCase() || r.category === item.category
        ) || { pricePerKg: 15, unit: 'kg' };

      const pricePerKg = rateObj.pricePerKg;
      const calculatedAmount = Math.round(item.estimatedWeightKg * pricePerKg);
      totalEstimatedAmount += calculatedAmount;

      materialsWithPrices.push({
        category: item.category,
        name: item.name,
        unit: item.unit || 'kg',
        pricePerKg,
        estimatedWeightKg: item.estimatedWeightKg,
        calculatedAmount,
      });
    }

    // 3. Generate secure OTP
    const { code: otpCode, expiresAt: otpExpiresAt } = generateOrderOtp();
    const orderId = this.generateOrderId();

    // 4. Create Order document
    const dealerCoords = dealer.location?.coordinates;
    const initialLocation =
      dealerCoords && Array.isArray(dealerCoords) && dealerCoords.length === 2
        ? {
            coordinates: dealerCoords as [number, number],
            heading: 0,
            speed: 0,
            updatedAt: new Date(),
            distanceKm: calculateDistanceKm(
              dealerCoords[1],
              dealerCoords[0],
              data.pickupCoordinates[1],
              data.pickupCoordinates[0]
            ),
            etaMinutes: estimateEtaMinutes(
              calculateDistanceKm(
                dealerCoords[1],
                dealerCoords[0],
                data.pickupCoordinates[1],
                data.pickupCoordinates[0]
              )
            ),
          }
        : undefined;

    const order = await Order.create({
      orderId,
      consumerId: new mongoose.Types.ObjectId(consumerId),
      dealerId: dealer.dealerId,
      dealerSnapshot: {
        businessName: dealer.businessName || 'Recycling Partner',
        contactPerson: dealer.contactPerson || 'Scrap Collector',
        phone: dealer.phone || '+91 98765 43210',
        vehicleType: dealer.vehicleType || 'Electric Mini Loader',
        vehicleNumber: dealer.vehicleNumber || 'DL-01-EV-9821',
      },
      pickupAddress: data.pickupAddress,
      pickupLocation: {
        type: 'Point',
        coordinates: data.pickupCoordinates,
      },
      selectedMaterials: materialsWithPrices,
      dealerPricesSnapshot: dealer.scrapRates || [],
      estimatedTotalAmount: totalEstimatedAmount,
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: new Date(),
          note: 'Pickup request placed by consumer. Waiting for dealer acceptance.',
          updatedBy: 'CONSUMER',
        },
      ],
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
        isVerified: false,
      },
      dealerLiveLocation: initialLocation,
      notes: data.notes,
    });

    // 5. Forward pickup notification to Kabadidealer partner backend via REST
    const user = await User.findById(consumerId).lean();
    await DealerGatewayService.notifyDealerNewPickup(order, {
      name: user?.name,
      phone: user?.phone || '+91 98765 43210',
    });

    // 6. Broadcast real-time urgent alert to dealer socket room
    socketEvents.emitNewPickupAlert(dealer.dealerId, order);

    return order;
  }

  /**
   * Transition order state with strict validation
   */
  static async transitionStatus(
    orderId: string,
    newStatus: OrderStatus,
    options: {
      updatedBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
      note?: string;
      cancellationReason?: string;
      finalWeights?: FinalWeightItem[];
      finalTotalAmount?: number;
      dealerLocation?: any;
    } = {}
  ): Promise<IOrder> {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const currentStatus = order.status;

    // Validate state machine rule
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed next states: [${allowed?.join(', ') || 'none'}]`
      );
    }

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: options.note || `Order status updated to ${newStatus}`,
      updatedBy: options.updatedBy || 'SYSTEM',
    });

    if (options.dealerLocation && options.dealerLocation.coordinates) {
      order.dealerLiveLocation = {
        coordinates: options.dealerLocation.coordinates,
        heading: options.dealerLocation.heading || 0,
        speed: options.dealerLocation.speed || 0,
        updatedAt: options.dealerLocation.updatedAt || new Date(),
        etaMinutes: options.dealerLocation.etaMinutes,
        distanceKm: options.dealerLocation.distanceKm,
      };
    }

    if (newStatus === 'CANCELLED') {
      order.cancellationReason = options.cancellationReason || 'Cancelled by user';
      order.cancelledBy = options.updatedBy || 'CONSUMER';
    }

    if (newStatus === 'COMPLETED') {
      if (options.finalWeights && options.finalWeights.length > 0) {
        order.finalWeights = options.finalWeights;
        order.finalTotalAmount =
          options.finalTotalAmount ??
          options.finalWeights.reduce((acc, item) => acc + item.finalAmount, 0);
      } else {
        order.finalTotalAmount = options.finalTotalAmount ?? order.estimatedTotalAmount;
      }
    }

    await order.save();

    // Broadcast update to consumer & rooms
    socketEvents.emitOrderStatusUpdate(
      order.orderId,
      order.consumerId.toString(),
      newStatus,
      {
        order,
        note: options.note,
        finalTotalAmount: order.finalTotalAmount,
      }
    );

    // If live location was supplied with status, emit location update
    if (order.dealerLiveLocation) {
      socketEvents.emitDealerLocation(
        order.orderId,
        order.consumerId.toString(),
        order.dealerLiveLocation
      );
    }

    return order;
  }

  /**
   * Verify pickup OTP provided by consumer to dealer
   */
  static async verifyPickupOtp(orderId: string, inputOtp: string): Promise<IOrder> {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'ARRIVED' && order.status !== 'OTP_PENDING') {
      throw new Error(
        `Cannot verify OTP in current status (${order.status}). Dealer must reach pickup location first.`
      );
    }

    if (order.otp.isVerified) {
      throw new Error('This order OTP has already been verified.');
    }

    if (new Date() > new Date(order.otp.expiresAt)) {
      throw new Error('Pickup OTP has expired.');
    }

    if (order.otp.code !== inputOtp.trim()) {
      throw new Error('Invalid OTP entered. Please ask the consumer for the 4-digit code.');
    }

    order.otp.isVerified = true;
    order.otp.verifiedAt = new Date();
    order.status = 'OTP_VERIFIED';
    order.statusHistory.push({
      status: 'OTP_VERIFIED',
      timestamp: new Date(),
      note: 'OTP verified on-site. Scrap weighing and collection in progress.',
      updatedBy: 'DEALER',
    });

    await order.save();

    socketEvents.emitOrderStatusUpdate(
      order.orderId,
      order.consumerId.toString(),
      'OTP_VERIFIED',
      { order }
    );

    return order;
  }

  /**
   * Push live dealer GPS location for active pickup
   */
  static async updateDealerLiveLocation(
    orderId: string,
    coords: [number, number], // [lng, lat]
    heading: number = 0,
    speed: number = 0
  ): Promise<IOrder> {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
    const [dealerLng, dealerLat] = coords;

    const distanceKm = calculateDistanceKm(pickupLat, pickupLng, dealerLat, dealerLng);
    const etaMinutes = estimateEtaMinutes(distanceKm);

    const locationUpdate: DealerLiveLocationUpdate = {
      coordinates: coords,
      heading,
      speed,
      updatedAt: new Date(),
      etaMinutes,
      distanceKm,
    };

    order.dealerLiveLocation = locationUpdate;
    await order.save();

    socketEvents.emitDealerLocation(
      order.orderId,
      order.consumerId.toString(),
      locationUpdate
    );

    return order;
  }

  /**
   * Get single order by orderId
   */
  static async getOrderByOrderId(orderId: string, consumerId?: string): Promise<IOrder | null> {
    const query: any = { orderId };
    if (consumerId) {
      query.consumerId = new mongoose.Types.ObjectId(consumerId);
    }
    return Order.findOne(query);
  }

  /**
   * Get order history for consumer
   */
  static async getConsumerOrders(
    consumerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: IOrder[]; total: number; page: number; pages: number }> {
    const query = { consumerId: new mongoose.Types.ObjectId(consumerId) };
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders: orders as any,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
