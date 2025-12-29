// File: src/components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Define auth pages that should be skipped by AuthProvider
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isAuthPage = authPages.some(page => pathname === page || pathname.startsWith(page));

    // Still loading session
    if (status === 'loading') {
      return;
    }

    // ✅ FIX: Skip all redirect logic on auth pages
    // Let the server-side checks in those pages handle redirects
    if (isAuthPage) {
      return;
    }

    // Homepage - redirect based on auth status
    if (pathname === '/') {
      if (status === 'authenticated' && session?.user) {
        const target = session.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
        router.replace(target);
      } else if (status === 'unauthenticated') {
        router.replace('/login');
      }
      return;
    }

    // Protected routes - require authentication
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    // Role-based redirects for authenticated users
    if (status === 'authenticated' && session?.user) {
      const userRole = session.user.role;
      
      // Admin trying to access customer routes
      if (pathname.startsWith('/dashboard') && userRole === 'ADMIN') {
        router.replace('/admin/dashboard');
        return;
      }
      
      // Customer trying to access admin routes
      if (pathname.startsWith('/admin') && userRole === 'CUSTOMER') {
        router.replace('/dashboard');
        return;
      }
    }
  }, [status, session, pathname, router]);

  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading eTuckshop...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}