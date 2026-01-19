import { z } from 'zod';

export const customerListSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
});

export const customerIdSchema = z
    .number({ required_error: 'Customer ID is required' })
    .int()
    .positive();
