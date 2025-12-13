// File: src/components/providers/SessionProvider.tsx

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import AuthProvider from './AuthProvider';

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Refetch session every 5 minutes
      refetchInterval={5 * 60}
      // Refetch on window focus
      refetchOnWindowFocus={true}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextAuthSessionProvider>
  );
}