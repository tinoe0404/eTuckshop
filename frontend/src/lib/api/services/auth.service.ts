import apiClient from '../client';
import { AuthResponse, ApiResponse, User } from '@/types';

export const authService = {
  signup: async (data: { 
    name: string; 
    email: string; 
    password: string; 
    role?: 'CUSTOMER' 
  }) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/signup', 
      data
    );
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login', 
      data
    );
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/logout',
      { refreshToken }
    );
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh', 
      { refreshToken }
    );
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },
};
