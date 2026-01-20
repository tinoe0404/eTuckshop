'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
    checkoutAction,
    cancelOrderAction,
    generateCashQRAction,
    getOrderQRAction,
    completePickupAction,
    rejectOrderAction,
} from './orders.actions';
import type { CheckoutPayload, CheckoutResponse } from './orders.types';

// ============================================
// CUSTOMER HOOKS
// ============================================

export const useCheckout = () => {
    const router = useRouter();
    return useMutation({
        mutationFn: async (payload: CheckoutPayload) => {
            const res = await checkoutAction(payload);
            if (!res.success) throw new Error(res.message);
            return res.data as CheckoutResponse;
        },
        onSuccess: (data) => {
            if (data.nextStep?.url) {
                router.push(data.nextStep.url);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Checkout failed');
        }
    });
};

export const useOrderQR = (orderId: number | null) => {
    return useQuery({
        queryKey: ['order-qr', orderId],
        queryFn: async () => {
            if (!orderId) return null;
            const res = await getOrderQRAction(orderId);
            if (!res.success) throw new Error(res.message);
            return res.data;
        },
        enabled: !!orderId,
    });
};

export const useGenerateCashQR = () => {
    return useMutation({
        mutationFn: async (orderId: number) => {
            const res = await generateCashQRAction(orderId);
            if (!res.success) throw new Error(res.message);
            return res.data;
        },
        onSuccess: () => {
            toast.success('QR Code generated');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

export const useCancelOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (orderId: number) => {
            const res = await cancelOrderAction(orderId);
            if (!res.success) throw new Error(res.message);
            return res.data;
        },
        onSuccess: (_, orderId) => {
            toast.success('Order cancelled');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

// ============================================
// ADMIN HOOKS
// ============================================

export const useCompleteOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { orderId: number; idempotencyKey?: string }) => {
            // If idempotencyKey is missing, we can generate one or skip
            const key = payload.idempotencyKey || `pickup-${payload.orderId}-${Date.now()}`;
            const res = await completePickupAction({ orderId: payload.orderId, idempotencyKey: key });
            if (!res.success) throw new Error(res.message);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Order completed successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['order-stats'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Pickup completion failed');
        }
    });
};

export const useRejectOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { orderId: number; reason?: string }) => {
            const res = await rejectOrderAction(payload.orderId);
            if (!res.success) throw new Error(res.message);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Order rejected');
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['order-stats'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Rejection failed');
        }
    });
};