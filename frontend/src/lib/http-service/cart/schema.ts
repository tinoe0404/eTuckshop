import { z } from 'zod';

/**
 * Schema for adding item to cart
 */
export const addToCartSchema = z.object({
    productId: z
        .number({ required_error: 'Product ID is required' })
        .int({ message: 'Product ID must be a whole number' })
        .positive({ message: 'Invalid product ID' }),

    quantity: z
        .number({ required_error: 'Quantity is required' })
        .int({ message: 'Quantity must be a whole number' })
        .min(1, { message: 'Quantity must be at least 1' })
        .max(999, { message: 'Quantity cannot exceed 999' }),
});

/**
 * Schema for updating cart item quantity
 */
export const updateCartItemSchema = z.object({
    quantity: z
        .number({ required_error: 'Quantity is required' })
        .int({ message: 'Quantity must be a whole number' })
        .min(1, { message: 'Quantity must be at least 1' })
        .max(999, { message: 'Quantity cannot exceed 999' }),
});

/**
 * Schema for cart item ID
 */
export const cartItemIdSchema = z
    .number({ required_error: 'Cart item ID is required' })
    .int({ message: 'Cart item ID must be a whole number' })
    .positive({ message: 'Invalid cart item ID' });
