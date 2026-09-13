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

    // 1. Broadcast to dealer app via BroadcastChannel for zero-latency sync
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kabadiwala_cross_app_sync');
        channel.postMessage({
          type: 'KABADI_RATING_SUBMITTED',
          rating: {
            orderId: data.orderId,
            score: data.score,
            feedback: data.feedback?.trim() || '',
            tags: data.tags || [],
            createdAt: new Date().toISOString(),
          },
        });
        channel.close();
      } catch {}

      // 2. Sync to dealer active order in localStorage if running on same device
      try {
        const activeStr = localStorage.getItem('kabadidealer_active_order');
        if (activeStr) {
          const parsed = JSON.parse(activeStr);
          if (parsed.orderId === data.orderId) {
            parsed.rating = {
              score: data.score,
              feedback: data.feedback?.trim() || '',
              tags: data.tags || [],
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem('kabadidealer_active_order', JSON.stringify(parsed));
          }
        }
      } catch {}
    }

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
