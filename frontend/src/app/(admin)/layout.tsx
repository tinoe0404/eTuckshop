'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { Toaster } from 'sonner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage
    if (isLoading) {
      return;
    }

    // Mark that we've checked at least once
    setHasChecked(true);

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.replace('/login?callbackUrl=' + encodeURIComponent(pathname));
      return;
    }

    // Redirect if not admin
    if (user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
  }, [isAuthenticated, user, isLoading, router, pathname]);

  // Show loading spinner while:
  // 1. Zustand is still loading/hydrating
  // 2. We haven't checked auth yet
  // 3. User is not authenticated or not admin
  if (isLoading || !hasChecked || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}