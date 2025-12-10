// components/auth/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'ADMIN' | 'CUSTOMER';
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for store to hydrate
    if (isLoading) return;

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    // Check role
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      if (user?.role === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else if (user?.role === 'CUSTOMER') {
        router.replace('/dashboard');
      } else {
        router.replace(redirectTo);
      }
    }
  }, [isAuthenticated, user, isLoading, requireAuth, requiredRole, redirectTo, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Show loading if not authenticated but should be
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Show loading if role doesn't match
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience wrapper for admin routes
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} requiredRole="ADMIN">
      {children}
    </ProtectedRoute>
  );
}

// Convenience wrapper for customer routes
export function CustomerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} requiredRole="CUSTOMER">
      {children}
    </ProtectedRoute>
  );
}