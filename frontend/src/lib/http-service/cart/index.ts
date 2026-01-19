import { apiClient } from '../apiClient';
import { addToCartSchema, updateCartItemSchema, cartItemIdSchema } from './schema';
import type { AddToCartPayload, UpdateCartItemPayload, CartResponse, CartItemResponse } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

/**
 * Get current user's cart
 */
export async function getCart(): Promise<CartResponse> {
    try {
        const response = await apiClient.get<ApiResponse<CartResponse>>(
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

/**
 * Add item to cart
 */
export async function addToCart(payload: AddToCartPayload): Promise<CartResponse> {
    try {
        const validated = addToCartSchema.parse(payload);

        const response = await apiClient.post<ApiResponse<CartResponse>>(
            '/cart/items',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to add to cart');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid cart data');
        }

        console.error('Add to cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to add to cart');
    }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
    itemId: number,
    payload: UpdateCartItemPayload
): Promise<CartResponse> {
    try {
        const validatedId = cartItemIdSchema.parse(itemId);
        const validated = updateCartItemSchema.parse(payload);

        const response = await apiClient.put<ApiResponse<CartResponse>>(
            `/cart/items/${validatedId}`,
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update cart');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid data');
        }

        console.error('Update cart item error:', error);
        throw error instanceof Error ? error : new Error('Failed to update cart');
    }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: number): Promise<CartResponse> {
    try {
        const validatedId = cartItemIdSchema.parse(itemId);

        const response = await apiClient.delete<ApiResponse<CartResponse>>(
            `/cart/items/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to remove item');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid cart item ID');
        }

        console.error('Remove from cart error:', error);
        throw error instanceof Error ? error : new Error('Failed to remove item');
    }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<{ message: string }> {
    try {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
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
