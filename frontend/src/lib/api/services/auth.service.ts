import apiClient from '../client';
import type { ApiResponse, User } from '@/types';

// ----------------- TYPES -----------------
interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

interface LoginData {
  email: string;
  password: string;
}

// Response type (no tokens in body anymore - they're in cookies)
interface AuthResponse {
  user: User;
}

// ----------------- AUTH SERVICE -----------------
export const authService = {
  // ---------------- SIGNUP ----------------
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', data);
    if (!res.data.success) throw new Error(res.data.message);
    // Cookies are automatically set by backend, no need to store tokens
    return res.data.data;
  },

  // ---------------- LOGIN ----------------
  login: async (data: LoginData): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (!res.data.success) throw new Error(res.data.message);
    // Cookies are automatically set by backend, no need to store tokens
    return res.data.data;
  },

  // ---------------- LOGOUT ----------------
  logout: async (): Promise<void> => {
    // Backend will clear cookies and invalidate refresh token
    const res = await apiClient.post<ApiResponse<null>>('/auth/logout', {});
    if (!res.data.success) throw new Error(res.data.message);
  },

  // -------------- REFRESH TOKEN --------------
  refreshToken: async (): Promise<void> => {
    // Refresh token is automatically sent via cookie
    const res = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {});
    if (!res.data.success) throw new Error(res.data.message);
    // New access token is automatically set as cookie by backend
  },

  // -------------- GET PROFILE --------------
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/profile');
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },
};