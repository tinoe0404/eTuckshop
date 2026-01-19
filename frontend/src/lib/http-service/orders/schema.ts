import { z } from 'zod';

/**
 * Schema for creating an order
 */
export const createOrderSchema = z.object({
    paymentType: z.enum(['CASH', 'PAYNOW']),
});

/**
 * Schema for updating order status (Admin)
 */
export const updateOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'COMPLETED', 'CANCELLED']),
});

/**
 * Order ID schema
 */
export const orderIdSchema = z
    .number()
    .int('Order ID must be a whole number')
    .positive('Invalid order ID');


