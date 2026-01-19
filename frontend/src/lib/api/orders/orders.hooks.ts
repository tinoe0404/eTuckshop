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
export function useUserOrders() { return { data: [], isLoading: false }; }
export function useOrder() { return { data: null, isLoading: false }; }
export function useAdminOrders() { return { data: [], isLoading: false }; }
export function useOrderStats() { return { data: null, isLoading: false }; }
export function useCompleteOrder() { return { mutate: () => { }, isPending: false }; }
export function useRejectOrder() { return { mutate: () => { }, isPending: false }; }
export function useScanQRCode() { return { mutate: () => { }, isPending: false }; }