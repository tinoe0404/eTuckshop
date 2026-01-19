import { apiClient } from '../apiClient';
import { addToCartSchema, updateCartItemSchema, cartItemIdSchema } from './schema';
import type { AddToCartPayload, UpdateCartItemPayload, Cart, CartSummary } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

/**
 * Get current user's cart
 */
export async function getCart(): Promise<Cart> {
    try {
        const response = await apiClient.get<ApiResponse<Cart>>(
            '/cart',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch cart');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch cart');
    }
}

export async function getCartSummary(): Promise<CartSummary> {
    try {
        const response = await apiClient.get<ApiResponse<CartSummary>>(
            '/cart/summary',
            { signal: AbortSignal.timeout(5000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch cart summary');
        }

        return response.data.data;
    } catch (error) {
        // Silently fail for summary or return default
        console.warn('Get cart summary error:', error);
        return { totalItems: 0, totalAmount: 0 };
    }
}

/**
 * Add item to cart
 */
export async function addToCart(payload: AddToCartPayload): Promise<Cart> {
    try {
        const validated = addToCartSchema.parse(payload);

        const response = await apiClient.post<ApiResponse<Cart>>(
            '/cart/items',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to add item to cart');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid item data');
        }

        console.error('Add to cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to add item to cart');
    }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
    payload: UpdateCartItemPayload
): Promise<Cart> {
    try {
        const validated = updateCartItemSchema.parse(payload);

        const response = await apiClient.put<ApiResponse<Cart>>(
            '/cart/items',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update cart item');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid item data');
        }

        console.error('Update cart item error:', error);
        throw error instanceof Error ? error : new Error('Failed to update cart item');
    }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: number): Promise<Cart> {
    try {
        const validatedId = cartItemIdSchema.parse(itemId);

        const response = await apiClient.delete<ApiResponse<Cart>>(
            `/cart/items/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to remove item from cart');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid item ID');
        }

        console.error('Remove from cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to remove item from cart');
    }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<Cart> {
    try {
        const response = await apiClient.delete<ApiResponse<Cart>>(
            '/cart',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to clear cart');
        }

        return response.data.data;
    } catch (error) {
        console.error('Clear cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to clear cart');
    }
}

