import api from './api';
import { Rating } from '../types';

export const ratingService = {
  async submitRating(data: {
    orderId: string;
    score: number;
    feedback?: string;
    tags?: string[];
  }): Promise<Rating> {
    const res = await api.post('/ratings', data);
    return res.data.data;
  },

  async getOrderRating(orderId: string): Promise<Rating | null> {
    try {
      const res = await api.get(`/ratings/order/${orderId}`);
      return res.data.data;
    } catch {
      return null;
    }
  },
};
