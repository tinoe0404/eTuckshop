// ============================================
// FILE: lib/api/services/auth.service.ts
// ============================================

import apiClient from '@/lib/api/client';
import type { ApiResponse, User, UpdateProfileData, ChangePasswordData } from '@/types';

// ----------------- TYPES -----------------
interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

interface AuthResponse {
  user: User;
}

// ----------------- AUTH SERVICE -----------------
export const authService = {
  // ---------------- SIGNUP ----------------
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', data);
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },

  // -----------------* NO LOGIN FUNCTION *-----------------
  // Login is handled entirely by NextAuth (signIn("credentials")).
  // ---------------------------------------------------------

  // -----------------* NO LOGOUT FUNCTION *-----------------
  // Logout uses NextAuth (signOut()).
  // ---------------------------------------------------------

  // -------------- UPDATE PROFILE --------------
  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const res = await apiClient.put<ApiResponse<User>>('/auth/profile', data);
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.data;
  },

  // -------------- CHANGE PASSWORD --------------
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    const res = await apiClient.put<ApiResponse<null>>('/auth/password', data);
    if (!res.data.success) throw new Error(res.data.message);
  },

  // -------------- FORGOT PASSWORD --------------
  forgotPassword: async (email: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
    if (!res.data.success) throw new Error(res.data.message);
  },
};
