import { z } from 'zod';

/**
 * Schema validator for QR scan endpoint
 * Prevents injection attacks and validates payload structure
 */
export const QRScanSchema = z.object({
    qrData: z.string()
        .min(10, 'QR data too short')
        .max(2000, 'QR data too large') // Reduced from unsafe 10000
        .refine((data) => {
            try {
                const parsed = JSON.parse(data);
                return parsed.orderId && parsed.orderNumber;
            } catch {
                return false;
            }
        }, { message: 'Invalid QR format' })
});

/**
 * Schema validator for checkout endpoint
 */
export const CheckoutSchema = z.object({
    paymentType: z.enum(['CASH', 'PAYNOW']).default('CASH')
});

/**
 * Schema validator for order completion
 */
export const CompleteOrderSchema = z.object({
    orderId: z.number().int().positive({
        message: 'Invalid order ID'
    })
});

/**
 * Helper to validate and parse request body safely
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}
