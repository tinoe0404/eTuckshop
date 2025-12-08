import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { authService } from '@/lib/api/services/auth.service';
import { toast } from 'sonner';

export const useLogout = () => {
  const router = useRouter();
  const { logout: clearAuthState } = useAuthStore();

  const logout = async () => {
    try {
      // Call backend logout (clears cookies and invalidates refresh token)
      await authService.logout();

      // Clear Zustand auth state
      clearAuthState();

      // Clear any other client-side storage
      localStorage.clear();
      sessionStorage.clear();

      toast.success('Logged out successfully');

      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (error: any) {
      // Even if logout fails, clear local state and redirect
      console.error('Logout error:', error);
      clearAuthState();
      localStorage.clear();
      sessionStorage.clear();
      
      toast.error('Logged out');
      router.push('/login');
      router.refresh();
    }
  };
  return { logout };

};