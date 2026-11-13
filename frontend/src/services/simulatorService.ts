import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const DEALER_SERVICE_API_KEY = 'kbad_shared_internal_secret_key_9988';

export const simulatorService = {
  /**
   * Simulate Dealer Accepting Order
   */
  async acceptOrder(orderId: string, dealerId: string, dealerCoords?: [number, number]) {
    const coords = dealerCoords && dealerCoords.length === 2 ? dealerCoords : [77.2150, 28.6250];
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/status`,
      {
        orderId,
        dealerId,
        status: 'ACCEPTED',
        note: 'Dealer confirmed pickup and is preparing vehicle.',
        dealerLocation: {
          coordinates: coords,
          heading: 45,
          speed: 0,
          updatedAt: new Date(),
        },
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },

  /**
   * Simulate Dealer Starting Trip (DEALER_EN_ROUTE)
   */
  async startTrip(orderId: string, dealerId: string) {
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/status`,
      {
        orderId,
        dealerId,
        status: 'DEALER_EN_ROUTE',
        note: 'Dealer is driving towards pickup location.',
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },

  /**
   * Simulate Dealer GPS Location Update
   */
  async sendLocationPing(
    orderId: string,
    dealerId: string,
    coordinates: [number, number],
    heading: number = 45
  ) {
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/location`,
      {
        orderId,
        dealerId,
        coordinates,
        heading,
        speed: 25,
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },

  /**
   * Simulate Dealer Arrived At Doorstep
   */
  async dealerArrived(orderId: string, dealerId: string) {
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/status`,
      {
        orderId,
        dealerId,
        status: 'ARRIVED',
        note: 'Dealer has arrived at consumer doorstep with electronic weighing scale.',
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },

  /**
   * Simulate Dealer Entering OTP to verify pickup
   */
  async verifyOtp(orderId: string, dealerId: string, otp: string) {
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/verify-otp`,
      {
        orderId,
        dealerId,
        otp,
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },

  /**
   * Simulate Dealer Completing Scrap Pickup & Digital Payment
   */
  async completeOrder(
    orderId: string,
    dealerId: string,
    finalWeights?: any[],
    finalTotalAmount?: number
  ) {
    const res = await axios.post(
      `${API_BASE_URL}/internal/dealer-events/status`,
      {
        orderId,
        dealerId,
        status: 'COMPLETED',
        note: 'Scrap weighed accurately and payment paid to customer.',
        finalWeights,
        finalTotalAmount,
      },
      {
        headers: {
          'x-dealer-api-key': DEALER_SERVICE_API_KEY,
        },
      }
    );
    return res.data;
  },
};
