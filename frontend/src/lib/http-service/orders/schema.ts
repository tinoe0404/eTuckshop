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

export const checkoutPayloadSchema = z.object({
    items: z.array(z.object({
        productId: z.number(),
        quantity: z.number().min(1)
    })),
    paymentType: z.enum(['CASH', 'PAYNOW'])
});

export const rejectOrderSchema = z.object({
    reason: z.string().min(1, "Reason is required")
});

export const scanQRCodeSchema = z.object({
    qrData: z.string().min(1, "QR code data is required")
});


