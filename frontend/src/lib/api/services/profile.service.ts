// File: src/lib/api/services/profile.service.ts (NEW SERVICE)

import apiClient from '../client';
import { User } from '@/types';

export const profileService = {
  /**
   * Get user profile by ID
   * Pass userId from NextAuth session
   */
  getProfile: async (userId: string) => {
    const response = await apiClient.post('/auth/profile/by-id', { userId });
    return response.data;
  },

  /**
   * Update user profile
   * Pass userId from NextAuth session
   */
  updateProfile: async (userId: string, data: { name: string; email: string; image?: string }) => {
    const response = await apiClient.put('/auth/profile/update', {
      userId,
      ...data,
    });
    return response.data;
  },
};