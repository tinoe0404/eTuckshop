import { z } from 'zod';

export const createCategorySchema = z.object({
    name: z.string().trim().min(2).max(50),
    description: z.string().trim().max(500).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdSchema = z.number().int().positive();
