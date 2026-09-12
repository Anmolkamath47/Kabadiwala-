import api from './api';
import { Order } from '../types';

export const orderService = {
  async createOrder(data: {
    dealerId: string;
    pickupAddress: string;
    pickupCoordinates: [number, number];
    selectedMaterials: Array<{
      category: string;
      name: string;
      unit: string;
      estimatedWeightKg: number;
    }>;
    notes?: string;
  }): Promise<Order> {
    const res = await api.post('/orders', data);
    return res.data.data;
  },

  async getConsumerOrders(page: number = 1, limit: number = 20): Promise<{ orders: Order[]; total: number; pages: number }> {
    const res = await api.get('/orders', { params: { page, limit } });
    return res.data.data;
  },

  async getOrderDetails(orderId: string): Promise<Order> {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data;
  },

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const res = await api.post(`/orders/${orderId}/cancel`, { reason });
    return res.data.data;
  },
};
