// app/(customer)/layout.tsx
'use client';

import { CustomerRoute } from '@/components/auth/ProtectedRoute';
import CustomerHeader from '@/components/layout/CustomerHeader';
import CustomerSidebar from '@/components/layout/CustomerSidebar';
import { Toaster } from 'sonner';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <CustomerHeader />
        <div className="flex">
          <CustomerSidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    </CustomerRoute>
  );
}