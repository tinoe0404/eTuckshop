// ============================================
// FILE: src/lib/api/services/profile.service.ts
// ============================================

import apiClient from '@/lib/api/client';
import type { ApiResponse, User, UpdateProfileData, ChangePasswordData } from '@/types';

export const profileService = {
  /**
   * Update user profile
   * @param userId - User ID from NextAuth session
   * @param data - Profile update data (name, email, image)
   */
  updateProfile: async (
    userId: number, 
    data: Omit<UpdateProfileData, 'userId'>
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', {
      userId,
      ...data,
    });
    return response.data;
  },

  /**
   * Change user password
   * @param userId - User ID from NextAuth session
   * @param data - Current and new password
   */
  changePassword: async (
    userId: number, 
    data: Omit<ChangePasswordData, 'userId'>
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.put<ApiResponse<null>>('/auth/password', {
      userId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return response.data;
  },
};