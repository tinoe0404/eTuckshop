'use client';

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { checkoutAction } from './orders.actions';
import type { CheckoutPayload, CheckoutResponse } from './orders.types';
import type { APIResponse } from '../client/types';

// Adjust APIResponse import path if previous files suggested it was ../client/types
// In orders.actions.ts: import type { APIResponse } from '../client/types';
// So from hooks (same dir as actions) it should be same: '../client/types'

type CheckoutMutationOptions = {
    onSuccess?: (data: CheckoutResponse) => void;
    onError?: (error: any) => void;
};

export function useCheckout() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((payload: CheckoutPayload, options?: CheckoutMutationOptions) => {
        startTransition(async () => {
            try {
                const result = await checkoutAction(payload);

                if (result.success && result.data) {
                    if (options?.onSuccess) {
                        options.onSuccess(result.data);
                    }
                } else {
                    const error = new Error(result.message || 'Checkout failed');
                    (error as any).response = { data: { message: result.message } }; // mimicking axios error structure if needed for legacy compatibility

                    if (options?.onError) {
                        options.onError(error);
                    } else {
                        toast.error(result.message || 'Checkout failed');
                    }
                }
            } catch (error) {
                if (options?.onError) {
                    options.onError(error);
                } else {
                    console.error('Checkout error:', error);
                    toast.error('An unexpected error occurred');
                }
            }
        });
    }, []);

    return { mutate, isPending };
}

// Stubs for others or implementing them if needed. 
// For now leaving them as stubs but correctly exported to avoid breaking imports
// ADMIN MUTATIONS

export function useCompleteOrder() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((payload: { orderId: number; idempotencyKey?: string }, options?: CheckoutMutationOptions) => {
        startTransition(async () => {
            // In a real app we might use idempotencyKey, but for now just update status
            try {
                const result = await import('./orders.actions').then(mod => mod.updateOrderStatusAction(payload.orderId, { status: 'COMPLETED' }));

                if (result.success) {
                    toast.success('Order completed successfully');
                    options?.onSuccess?.(result.data as any);
                } else {
                    toast.error(result.message || 'Failed to complete order');
                    options?.onError?.(new Error(result.message));
                }
            } catch (error) {
                console.error('Complete order error:', error);
                toast.error('An unexpected error occurred');
                options?.onError?.(error);
            }
        });
    }, []);

    return { mutate, isPending };
}

export function useRejectOrder() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((payload: { orderId: number; reason?: string }, options?: CheckoutMutationOptions) => {
        startTransition(async () => {
            try {
                // Rejecting implies cancelling. Reason is valuable but maybe not supported by simple status update yet unless we have a separate field.
                // For now, mapping to CANCELLED status.
                const result = await import('./orders.actions').then(mod => mod.updateOrderStatusAction(payload.orderId, { status: 'CANCELLED' }));

                if (result.success) {
                    toast.success('Order rejected/cancelled');
                    options?.onSuccess?.(result.data as any);
                } else {
                    toast.error(result.message || 'Failed to reject order');
                    options?.onError?.(new Error(result.message));
                }
            } catch (error) {
                console.error('Reject order error:', error);
                toast.error('An unexpected error occurred');
                options?.onError?.(error);
            }
        });
    }, []);

    return { mutate, isPending };
}

// Queries - Stubs/Helpers
// Since we are moving to Server Components, these might not be needed for data fetching if we pass data down.
// But for client interaction or optimistic updates they can be useful.
export function useUserOrders() { return { data: [], isLoading: false }; }
export function useOrder(id?: number) { return { data: null, isLoading: false }; }
export function useAdminOrders(params?: any) { return { data: { orders: [], pagination: {} }, isLoading: false }; }
export function useOrderStats() { return { data: null, isLoading: false }; }
export function useScanQRCode() { return { mutate: () => { }, isPending: false }; }