'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import {authService} from '@/lib/api/services/auth.service';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to get the user profile (cookies will be sent automatically)
        const user = await authService.getProfile();
        setUser(user);
      } catch (error) {
        // No valid session, clear user
        setUser(null);
      }
    };

    initializeAuth();
  }, [setUser, setLoading]);

  return <>{children}</>;
}