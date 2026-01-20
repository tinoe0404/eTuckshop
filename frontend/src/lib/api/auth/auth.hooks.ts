'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import {
    signupRawAction,
    forgotPasswordRawAction,
    resetPasswordRawAction
} from './auth.actions';

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

    return {
        mutate: async () => {
            await signOut({ redirect: false });
            router.push('/login');
            toast.success('Logged out successfully');
        },
        isPending: false
    };
}

// ==========================================
// AUTH MUTATION HOOKS
// ==========================================

export function useSignup() {
    const router = useRouter();
    return useMutation({
        mutationFn: signupRawAction,
        onSuccess: (res) => {
            if (res.success) {
                toast.success('Account created successfully');
                router.push('/login');
            } else {
                toast.error(res.message || 'Signup failed');
            }
        },
        onError: (err: any) => {
            toast.error(err.message || 'Signup failed');
        }
    });
}

export function useForgotPassword() {
    return useMutation({
        mutationFn: forgotPasswordRawAction,
        onSuccess: (res) => {
            if (res.success) {
                toast.success('Reset email sent successfully');
            } else {
                toast.error(res.message || 'Failed to send reset email');
            }
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to send reset email');
        }
    });
}

export function useResetPassword() {
    const router = useRouter();
    return useMutation({
        mutationFn: resetPasswordRawAction,
        onSuccess: (res) => {
            if (res.success) {
                toast.success('Password reset successfully');
                router.push('/login');
            } else {
                toast.error(res.message || 'Reset failed');
            }
        },
        onError: (err: any) => {
            toast.error(err.message || 'Reset failed');
        }
    });
}
