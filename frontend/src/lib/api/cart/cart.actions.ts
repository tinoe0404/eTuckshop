'use server';

import { revalidatePath } from 'next/cache';
import { cartService } from './cart.client';
import { addToCartSchema, updateCartItemSchema, cartItemIdSchema } from './cart.schemas';
import type { Cart, CartSummary, AddToCartPayload, UpdateCartItemPayload } from './cart.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

/**
 * Server Action: Get Cart
 * Fetches user's cart with all items
 * 
 * @returns APIResponse with cart or error
 */
export async function getCartAction(): Promise<APIResponse<Cart | null>> {
    try {
        const response = await cartService.getCart();
        return response;
    } catch (error) {
        console.error('[getCartAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch cart',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Get Cart Summary
 * Fetches cart summary (total items and amount)
 * 
 * @returns APIResponse with cart summary or error
 */
export async function getCartSummaryAction(): Promise<APIResponse<CartSummary | null>> {
    try {
        const response = await cartService.getSummary();
        return response;
    } catch (error) {
        console.error('[getCartSummaryAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch cart summary',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Add to Cart
 * Adds a product to the cart
 * 
 * @param payload - Add to cart payload
 * @returns APIResponse with updated cart or error
 */
export async function addToCartAction(
    payload: AddToCartPayload
): Promise<APIResponse<Cart | null>> {
    try {
        // Validate with Zod
        const validated = addToCartSchema.parse(payload);

        // Call service
        const response = await cartService.addItem(validated);

        // Revalidate cart pages
        revalidatePath('/cart');
        revalidatePath('/dashboard');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid input data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[addToCartAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to add item to cart',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Update Cart Item
 * Updates quantity of a cart item
 * 
 * @param payload - Update payload including productId and new quantity
 * @returns APIResponse with updated cart or error
 */
export async function updateCartItemAction(
    payload: UpdateCartItemPayload
): Promise<APIResponse<Cart | null>> {
    try {
        // Validate with Zod
        const validated = updateCartItemSchema.parse(payload);

        // Call service
        const response = await cartService.updateItem(validated);

        // Revalidate cart pages
        revalidatePath('/cart');
        revalidatePath('/dashboard');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid input data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[updateCartItemAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update cart item',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Remove from Cart
 * Removes a product from the cart
 * 
 * @param productId - Product ID to remove
 * @returns APIResponse with updated cart or error
 */
export async function removeFromCartAction(productId: number): Promise<APIResponse<Cart | null>> {
    try {
        // Validate ID
        cartItemIdSchema.parse(productId);

        // Call service
        const response = await cartService.removeItem(productId);

        // Revalidate cart pages
        revalidatePath('/cart');
        revalidatePath('/dashboard');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Invalid item ID',
                data: null,
                error: 'Invalid item ID',
            };
        }

        console.error('[removeFromCartAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to remove item from cart',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Clear Cart
 * Clears all items from the cart
 * 
 * @returns APIResponse with empty cart or error
 */
export async function clearCartAction(): Promise<APIResponse<Cart | null>> {
    try {
        // Call service
        const response = await cartService.clear();

        // Revalidate cart pages
        revalidatePath('/cart');
        revalidatePath('/dashboard');

        return response;
    } catch (error) {
        console.error('[clearCartAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to clear cart',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
