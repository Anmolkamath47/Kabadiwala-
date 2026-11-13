import api from './api';
import { WalletData, WalletTransaction } from '../types';

export interface WalletDashboardResponse {
  wallet: WalletData;
  transactions: WalletTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const walletService = {
  /**
   * Get user wallet dashboard with balance & recent transaction history
   */
  async getWalletDashboard(
    page: number = 1,
    limit: number = 20,
    type?: 'EARNED' | 'REDEEMED'
  ): Promise<WalletDashboardResponse> {
    const params: any = { page, limit };
    if (type) params.type = type;

    const res = await api.get('/wallet', { params });
    return res.data.data;
  },

  /**
   * Get paginated transaction history
   */
  async getTransactions(
    page: number = 1,
    limit: number = 20,
    type?: 'EARNED' | 'REDEEMED'
  ): Promise<{ transactions: WalletTransaction[]; pagination: any }> {
    const params: any = { page, limit };
    if (type) params.type = type;

    const res = await api.get('/wallet/transactions', { params });
    return res.data.data;
  },
};
