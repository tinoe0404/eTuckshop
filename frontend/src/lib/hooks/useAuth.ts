// File: src/lib/hooks/useAuth.ts (CREATE THIS FILE)

import { useSession, signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { profileService } from '@/lib/api/services/profile.service';

/**
 * Custom hook for authentication with NextAuth
 * Provides user, loading, and authenticated state
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  
  return {
    user: session?.user,
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    updateSession: update,
  };
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const router = useRouter();
  
  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      toast.success('Logged out successfully');
      router.replace('/login');
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    },
  });
}

/**
 * Hook for updating user profile
 */
export function useUpdateProfile() {
  const { user, updateSession } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { name: string; email: string; image?: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return profileService.updateProfile(user.id, data);
    },
    onSuccess: async (response) => {
      // Update NextAuth session with new data
      await updateSession({
        name: response.data.name,
        email: response.data.email,
        image: response.data.image,
      });
      
      toast.success('Profile updated successfully');
      return response.data;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    },
  });
}

/**
 * Hook to check if user has specific role
 */
export function useRequireRole(requiredRole: 'ADMIN' | 'CUSTOMER') {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  if (isLoading) {
    return { hasAccess: false, isLoading: true };
  }
  
  if (!isAuthenticated) {
    router.replace('/login');
    return { hasAccess: false, isLoading: false };
  }
  
  if (user?.role !== requiredRole) {
    const redirectTo = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
    router.replace(redirectTo);
    toast.error('Access denied');
    return { hasAccess: false, isLoading: false };
  }
  
  return { hasAccess: true, isLoading: false };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'ADMIN';
}

/**
 * Hook to check if user is customer
 */
export function useIsCustomer() {
  const { user } = useAuth();
  return user?.role === 'CUSTOMER';
}

/**
 * Hook for user registration (signup)
 */
export function useSignup() {
  const router = useRouter();
  
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role?: string }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Registration failed');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Registration successful! Please login.');
      router.push('/login');
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to register';
      toast.error(message);
    },
  });
}