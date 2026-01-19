// ============================================
// FILE: src/lib/hooks/useProfile.ts
// ============================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, changePassword } from '@/lib/http-service/profile';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

// ========================
// MUTATION HOOKS
// ========================

/**
 * ✅ Update profile mutation
 * - Updates NextAuth session automatically
 * - Invalidates user orders (in case name changed)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { name: string; email: string } }) =>
      updateProfile({ ...data }),

    onSuccess: (response) => {
      toast.success('Profile updated successfully');

      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },

    onError: (error: any) => {
      toast.error(
        error?.message ??
        'Failed to update profile'
      );
    },
  });
}

/**
 * ✅ Change password mutation
 * - Logs user out after success
 * - Shows toast with countdown
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ userId, data }: {
      userId: number;
      data: { currentPassword: string; newPassword: string }
    }) => changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),

    onSuccess: async () => {
      toast.success('Password changed successfully. Logging out...');

      // Log out after 2 seconds
      setTimeout(async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
      }, 2000);
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ??
        error.message ??
        'Failed to change password'
      );
    },
  });
}