import api from './api';
import { UserProfile } from '../types';

export const authService = {
  async requestOtp(phone: string): Promise<{ message: string; expiresAt: string; demoOtp?: string }> {
    const res = await api.post('/auth/send-otp', { phone });
    return res.data.data;
  },

  async verifyOtp(
    phone: string,
    otp: string,
    name?: string
  ): Promise<{
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const res = await api.post('/auth/verify-otp', { phone, otp, name });
    return res.data.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },

  async updateProfile(updates: {
    name?: string;
    profileImage?: string;
    email?: string;
    isProfileCompleted?: boolean;
    currentLocation?: any;
  }): Promise<UserProfile> {
    const res = await api.patch('/users/profile', updates);
    return res.data.data;
  },

  async addSavedLocation(location: any): Promise<any[]> {
    const res = await api.post('/users/locations', location);
    return res.data.data;
  },

  async updateSavedLocation(locationId: string, location: any): Promise<any[]> {
    const res = await api.put(`/users/locations/${locationId}`, location);
    return res.data.data;
  },

  async deleteSavedLocation(locationId: string): Promise<any[]> {
    const res = await api.delete(`/users/locations/${locationId}`);
    return res.data.data;
  },
};
