// lib/hooks/useAuth.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { authService } from '@/lib/api/services/auth.service';
import { toast } from 'sonner';

// ---------------- LOGIN HOOK ----------------
export const useLogin = () => {
  const router = useRouter();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Save user to Zustand
      setUser(data.user);
      
      // Show success message
      toast.success(`Welcome back, ${data.user.name}!`);

      // Role-based redirect
      if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });
};

// ---------------- SIGNUP HOOK ----------------
export const useSignup = () => {
  const router = useRouter();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: authService.signup,
    onSuccess: (data) => {
      // Save user to Zustand
      setUser(data.user);
      
      // Show success message
      toast.success(`Account created! Welcome, ${data.user.name}`);

      // Role-based redirect
      if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Signup failed');
    },
  });
};

// ---------------- LOGOUT HOOK ----------------
export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Clear Zustand state
      clearAuth();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Show success message
      toast.success('Logged out successfully');

      // Redirect to login
      router.push('/login');
    },
    onError: (error: any) => {
      // Even if logout fails on backend, clear frontend state
      clearAuth();
      queryClient.clear();
      
      toast.error('Logout failed, but cleared local session');
      router.push('/login');
    },
  });
};

// ---------------- UPDATE PROFILE HOOK ----------------
export const useUpdateProfile = () => {
  const { setUser, user } = useAuthStore();

  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (updatedUser) => {
      // Update Zustand with new user data
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });
};

// ---------------- CHANGE PASSWORD HOOK ----------------
export const useChangePassword = () => {
  return useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });
};