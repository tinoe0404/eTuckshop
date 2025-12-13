// File: src/app/page.tsx (FIXED)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user) {
      // Redirect based on role
      const redirectTo = session.user.role === 'ADMIN' 
        ? '/admin/dashboard' 
        : '/dashboard';
      router.replace(redirectTo);
    } else {
      // Not logged in, go to login
      router.replace('/login');
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading eTuckshop...</p>
      </div>
    </div>
  );
}