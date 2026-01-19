import { z } from 'zod';

/**
 * Schema for adding item to cart
 */
export const addToCartSchema = z.object({
    productId: z
        .number()
        .int('Product ID must be a whole number')
        .positive('Invalid product ID'),

    quantity: z
        .number()
        .int('Quantity must be a whole number')
        .min(1, 'Quantity must be at least 1')
        .max(999, 'Quantity cannot exceed 999'),
});

/**
 * Schema for updating cart item quantity
 */
export const updateCartItemSchema = z.object({
    quantity: z
        .number()
        .int('Quantity must be a whole number')
        .min(1, 'Quantity must be at least 1')
        .max(999, 'Quantity cannot exceed 999'),
});

/**
 * Schema for cart item ID
 */
export const cartItemIdSchema = z
    .number()
    .int('Cart item ID must be a whole number')
    .positive('Invalid cart item ID');


