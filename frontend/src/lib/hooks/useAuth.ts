// File: src/lib/hooks/useAuth.ts (UPDATED FOR NEXTAUTH)

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import axios from "axios";
import { ApiResponse } from '@/types';
import { User } from 'next-auth';


// ---------------- SIGNUP HOOK ----------------
interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

// File: src/lib/hooks/useAuth.ts
export function useSignup() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      const res = await axios.post("/api/auth/register", data);
      return res.data;
    },

    onSuccess: async (data, variables) => {
      toast.success("Account created successfully!");

      // Auto-login using the same credentials
      const login = await signIn("credentials", {
        redirect: false,
        email: variables.email,
        password: variables.password,
      });

      if (login?.error) {
        toast.error("Account created, but auto-login failed. Please sign in manually.");
        return;
      }

      toast.success("Logged in!");
      window.location.href = variables.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
    },

    onError: () => {
      toast.error("Failed to create account. Try again.");
    }
  });
}

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

