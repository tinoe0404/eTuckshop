// components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { setUser, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    if (status === 'loading') return;

    // Public routes → no need for auth check
    if (isPublic) {
      clearAuth();
      setLoading(false);
      return;
    }

    // Authenticated
    if (status === 'authenticated' && session?.user) {
      setUser(session.user as any);
      setLoading(false);
      return;
    }

    // Not authenticated → redirect
    if (status === 'unauthenticated') {
      clearAuth();
      router.replace('/login');
      setLoading(false);
    }
  }, [status, session, pathname, router]);

  return <>{children}</>;
}
