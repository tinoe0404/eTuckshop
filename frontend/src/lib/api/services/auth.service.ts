// ============================================
// FILE: src/lib/api/services/auth.service.ts (UPDATED)
// ============================================

import apiClient from '@/lib/api/client';
import type { ApiResponse, User, ForgotPasswordData, ResetPasswordData } from '@/types';

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

  // -------------- FORGOT PASSWORD --------------
  /**
   * Request password reset email
   * @param email - User's email address
   */
  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { 
      email 
    });
    return response.data;
  },

  // -------------- RESET PASSWORD --------------
  /**
   * Reset password using token from email
   * @param data - Reset token and new password
   */
  resetPassword: async (data: ResetPasswordData): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/auth/reset-password', {
      token: data.token,
      newPassword: data.newPassword,
    });
    return response.data;
  },
};