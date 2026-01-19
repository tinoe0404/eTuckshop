// ============================================
// File: src/lib/hooks/useAuth.ts
// ============================================

import { useSession, signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/http-service/profile';
import { signup } from '@/lib/http-service/auth';
import { useEffect } from 'react';
import type { SignupPayload } from '@/lib/http-service/auth/types';

/**
 * Custom hook for authentication
 * ✅ SAFE: { required: false } prevents automatic redirects
 */
export function useAuth() {
  const { data: session, status, update } = useSession({ required: false });

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
      router.push('/login');
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
  const { updateSession } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; image?: string }) => {
      // API client now handles Zod validation internally
      return updateProfile(data);
    },
    onSuccess: async (response) => {
      await updateSession({
        name: response.name,
        email: response.email,
        image: response.image || undefined,
      });
      toast.success('Profile updated successfully');
      return response;
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update profile';
      toast.error(message);
    },
  });
}

/**
 * ⚠️ DANGER: Do NOT use this on Login or Register pages.
 * Only use inside protected Dashboard pages.
 */
export function useRequireRole(requiredRole: 'ADMIN' | 'CUSTOMER') {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if loading is finished
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role !== requiredRole) {
        const redirectTo = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
        router.replace(redirectTo);
        toast.error('Access denied');
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  return { hasAccess: isAuthenticated && user?.role === requiredRole, isLoading };
}

/**
 * ✅ SAFE: Use this in Navbar/Sidebar to conditionally render links
 */
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'ADMIN';
}

/**
 * ✅ SAFE: Use this in Navbar/Sidebar to conditionally render links
 */
export function useIsCustomer() {
  const { user } = useAuth();
  return user?.role === 'CUSTOMER';
}

/**
 * Hook for user registration
 */
export function useSignup() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: SignupPayload) => {
      // Uses the new validation-enabled API client
      const response = await signup(data);
      return response;
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