// File: src/lib/hooks/useAuth.ts (UPDATED FOR NEXTAUTH)

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { ApiResponse, User } from '@/types';

// ---------------- SIGNUP HOOK ----------------
interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

// File: src/lib/hooks/useAuth.ts

export const useSignup = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: SignupData) => {
      const res = await apiClient.post<ApiResponse<{ user: User }>>(
        '/auth/register',
        data
      );
      
      if (!res.data.success) {
        throw new Error(res.data.message);
      }
      
      return { user: res.data.data.user, credentials: data };
    },
    onSuccess: async ({ user, credentials }) => {
      toast.success(`Account created! Signing you in...`);

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Account created but login failed. Please sign in manually.');
        router.push('/login');
        return;
      }

      // Get session to verify
      const session = await getSession();
      
      if (!session?.user) {
        toast.error('Please sign in to continue');
        router.push('/login');
        return;
      }

      // Role-based redirect
      if (session.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message;
      
      // Better error messages
      if (message.includes('already exists')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(message || 'Signup failed');
      }
    },
  });
};

// ---------------- LOGIN HOOK ----------------
interface LoginData {
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

// File: src/lib/hooks/useAuth.ts

export const useLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Return a simple success object
      return { success: true };
    },
    onSuccess: async () => {
      // Get the session (which has user info)
      const session = await getSession();
      
      if (!session?.user) {
        throw new Error('Failed to get session');
      }

      toast.success(`Welcome back, ${session.user.name}!`);

      // Role-based redirect
      if (session.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed');
    },
  });
};

// ---------------- LOGOUT HOOK ----------------
export const useLogout = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      toast.success('Logged out successfully');
      router.push('/login');
    },
    onError: (error: any) => {
      toast.error('Logout failed');
      // Force logout anyway
      router.push('/login');
    },
  });
};

// ---------------- UPDATE PROFILE HOOK ----------------
interface UpdateProfileData {
  name: string;
  email: string;
  image?: string;
}

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const res = await apiClient.put<ApiResponse<User>>('/auth/profile', data);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });
};

// ---------------- CHANGE PASSWORD HOOK ----------------
interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const res = await apiClient.put<ApiResponse<null>>('/auth/password', data);
      if (!res.data.success) throw new Error(res.data.message);
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });
};

