import api from './api';
import { Dealer, ScrapCategory, CategoryCardInfo } from '../types';

export const dealerService = {
  async getNearbyDealers(
    lat: number,
    lng: number,
    radius: number = 15,
    category?: ScrapCategory
  ): Promise<{ dealers: Dealer[]; count: number }> {
    const params: any = { lat, lng, radius };
    if (category) params.category = category;
    const res = await api.get('/dealers/nearby', { params });
    return res.data.data;
  },

  async getDealerDetails(dealerId: string): Promise<Dealer> {
    const res = await api.get(`/dealers/${dealerId}`);
    return res.data.data;
  },

  async getScrapCategories(): Promise<CategoryCardInfo[]> {
    const res = await api.get('/dealers/categories');
    return res.data.data;
  },
};
