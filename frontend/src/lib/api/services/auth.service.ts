import apiClient from '../client';
import type { ApiResponse, AuthResponse, User } from '@/types';

// ----------------- TYPES -----------------
interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN'; // <-- allow both roles
}

interface LoginData {
  email: string;
  password: string;
}

// ----------------- AUTH SERVICE -----------------
export const authService = {
  // ---------------- SIGNUP ----------------
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', data);
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },

  // ---------------- LOGIN ----------------
  login: async (data: LoginData): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },

  // ---------------- LOGOUT ----------------
  logout: async (refreshToken: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<null>>('/auth/logout', { refreshToken });
    if (!res.data.success) throw new Error(res.data.message);
  },

  // -------------- REFRESH TOKEN --------------
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const res = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', { refreshToken });
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },

  // -------------- GET PROFILE --------------
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/profile');
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },
};
