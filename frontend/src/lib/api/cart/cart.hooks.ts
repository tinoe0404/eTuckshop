'use client';

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import {
    addToCartAction,
    updateCartItemAction,
    removeFromCartAction,
    clearCartAction
} from './cart.actions';
import type { Product } from '@/types';
import type { AddToCartPayload, UpdateCartItemPayload } from './cart.types'; // Adjust imports as needed

// Extend payload to accept Product for optimistic updates if needed, 
// though for now we just accept what the action needs + potential extra fields the UI passes
type AddToCartMutationPayload = AddToCartPayload & { product?: Product };

// Read hooks removed as they are replaced by Server Actions/Server Components
// useCart -> getCartAction (Server)
// useCartSummary -> getCartSummaryAction (Server)
// useCartCount -> Passed as prop from Server Layout

export function useAddToCart() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((payload: AddToCartMutationPayload) => {
        startTransition(async () => {
            const result = await addToCartAction({
                productId: payload.productId,
                quantity: payload.quantity
            });

            if (result.success) {
                toast.success('Added to cart');
            } else {
                toast.error(result.message || 'Failed to add to cart');
            }
        });
    }, []);

    return { mutate, isPending };
}

export function useUpdateCartItem() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((payload: UpdateCartItemPayload) => {
        startTransition(async () => {
            const result = await updateCartItemAction(payload);

            if (!result.success) {
                toast.error(result.message || 'Failed to update cart');
            }
        });
    }, []);

    return { mutate, isPending };
}

export function useRemoveFromCart() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback((productId: number) => {
        startTransition(async () => {
            const result = await removeFromCartAction(productId);

            if (result.success) {
                toast.success('Item removed from cart');
            } else {
                toast.error(result.message || 'Failed to remove item');
            }
        });
    }, []);

    return { mutate, isPending };
}

export function useClearCart() {
    const [isPending, startTransition] = useTransition();

    const mutate = useCallback(() => {
        startTransition(async () => {
            const result = await clearCartAction();

            if (result.success) {
                toast.success('Cart cleared');
            } else {
                toast.error(result.message || 'Failed to clear cart');
            }
        });
    }, []);

    return { mutate, isPending };
}