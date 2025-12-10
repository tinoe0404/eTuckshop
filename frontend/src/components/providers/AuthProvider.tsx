// components/providers/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { authService } from '@/lib/api/services/auth.service';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setUser, clearAuth, setLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only run once on mount
    if (initialized) return;

    const initializeAuth = async () => {
      // ✅ Define public routes that don't need auth
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
      
      if (isPublicPath) {
        console.log('📍 Public page, skipping auth check');
        setLoading(false);
        setInitialized(true);
        return;
      }

      console.log('🔐 Checking authentication...');
      setLoading(true);

      try {
        // Try to get the user profile with a timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        
        const user = await Promise.race([
          authService.getProfile(),
          timeoutPromise
        ]);
        
        console.log('✅ User authenticated:', user);
        setUser(user as any);
      } catch (error: any) {
        console.log('❌ Auth check failed:', error.message);
        clearAuth();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []); // Only run once on mount

  return <>{children}</>;
}