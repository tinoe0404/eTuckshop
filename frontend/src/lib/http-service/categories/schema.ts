import { z } from 'zod';

/**
 * Schema for creating a category
 */
export const createCategorySchema = z.object({
    name: z
        .string({ required_error: 'Category name is required' })
        .trim()
        .min(2, { message: 'Category name must be at least 2 characters' })
        .max(50, { message: 'Category name must not exceed 50 characters' }),

    description: z
        .string()
        .trim()
        .max(500, { message: 'Description must not exceed 500 characters' })
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
    .number({ required_error: 'Category ID is required' })
    .int({ message: 'Category ID must be a whole number' })
    .positive({ message: 'Invalid category ID' });
