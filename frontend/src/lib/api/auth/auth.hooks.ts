'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

// ==========================================
// SESSION HOOKS
// ==========================================

export function useAuth() {
    const { data: session, status, update } = useSession();

    return {
        user: session?.user,
        session,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
        updateSession: update,
    };
}

export function useIsAdmin() {
    const { user } = useAuth();
    return user?.role === 'ADMIN';
}

export function useIsCustomer() {
    const { user } = useAuth();
    return user?.role === 'CUSTOMER';
}

export function useRequireRole(requiredRole: 'ADMIN' | 'CUSTOMER') {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace('/login');
            } else if (user?.role !== requiredRole) {
                const dest = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
                router.replace(dest);
                toast.error('Access denied');
            }
        }
    }, [isLoading, isAuthenticated, user, requiredRole, router]);

    return {
        hasAccess: isAuthenticated && user?.role === requiredRole,
        isLoading
    };
}

export function useLogout() {
    const router = useRouter();

    // Return a mutation-like object for compatibility
    return {
        mutate: async () => {
            await signOut({ redirect: false });
            router.push('/login');
            toast.success('Logged out successfully');
        },
        isPending: false
    };
}

// Stubs for removed auth hooks (pages should use Server Actions now)
export function useSignup() {
    return { mutate: () => console.warn('Use server action'), isPending: false };
}
export function useForgotPassword() {
    return { mutate: () => console.warn('Use server action'), isPending: false };
}
export function useResetPassword() {
    return { mutate: () => console.warn('Use server action'), isPending: false };
}
