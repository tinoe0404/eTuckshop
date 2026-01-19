import { z } from 'zod';

/**
 * Schema for creating a category
 */
export const createCategorySchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Category name must be at least 2 characters')
        .max(50, 'Category name must not exceed 50 characters'),

    description: z
        .string()
        .trim()
        .max(500, 'Description must not exceed 500 characters')
        .optional()
        .nullable(),
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * Category ID schema
 */
export const categoryIdSchema = z
    .number()
    .int('Category ID must be a whole number')
    .positive('Invalid category ID');


