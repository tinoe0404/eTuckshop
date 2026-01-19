import { z } from 'zod';

/**
 * Schema for creating an order
 */
export const createOrderSchema = z.object({
    paymentType: z.enum(['CASH', 'PAYNOW'], {
        errorMap: () => ({ message: 'Payment type must be CASH or PAYNOW' }),
    }),
});

/**
 * Schema for updating order status (Admin)
 */
export const updateOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'], {
        errorMap: () => ({ message: 'Invalid order status' }),
    }),
});

/**
 * Order ID schema
 */
export const orderIdSchema = z
    .number({ required_error: 'Order ID is required' })
    .int({ message: 'Order ID must be a whole number' })
    .positive({ message: 'Invalid order ID' });
