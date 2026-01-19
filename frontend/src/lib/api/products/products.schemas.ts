import { z } from 'zod';

/**
 * Schema for creating a new product
 * Admin-only operation
 */
export const createProductSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Product name must be at least 2 characters')
        .max(100, 'Product name must not exceed 100 characters'),

    description: z
        .string()
        .trim()
        .max(1000, 'Description must not exceed 1000 characters')
        .optional()
        .nullable(),

    price: z
        .number()
        .positive('Price must be greater than 0')
        .max(1000000, 'Price must not exceed 1,000,000')
        .refine((val) => Number.isFinite(val), 'Price must be a valid number')
        .refine((val) => {
            // Check if has at most 2 decimal places
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
        }, 'Price must have at most 2 decimal places'),

    stock: z
        .number()
        .int('Stock must be a whole number')
        .min(0, 'Stock cannot be negative')
        .max(100000, 'Stock must not exceed 100,000'),

    categoryId: z
        .number()
        .int('Category ID must be a whole number')
        .positive('Invalid category ID'),

    image: z
        .string()
        .url('Image must be a valid URL')
        .max(500, 'Image URL must not exceed 500 characters')
        .optional()
        .nullable(),
});

/**
 * Schema for updating an existing product
 * All fields optional for partial updates
 */
export const updateProductSchema = createProductSchema.partial();

/**
 * Schema for product search/filter parameters
 */
export const productSearchSchema = z.object({
    search: z
        .string()
        .trim()
        .max(100, 'Search query must not exceed 100 characters')
        .optional(),

    categoryId: z
        .number()
        .int()
        .positive()
        .optional(),

    minPrice: z
        .number()
        .min(0)
        .optional(),

    maxPrice: z
        .number()
        .positive()
        .optional(),

    inStock: z
        .boolean()
        .optional(),

    limit: z
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit must not exceed 100')
        .optional()
        .default(20),

    page: z
        .number()
        .int()
        .min(1, 'Page must be at least 1')
        .optional()
        .default(1),

    sort: z
        .enum(['name', 'price', 'stock', 'createdAt'])
        .optional()
        .default('createdAt'),

    order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc'),
}).refine(
    (data) => {
        // If both minPrice and maxPrice are provided, minPrice must be less than maxPrice
        if (data.minPrice !== undefined && data.maxPrice !== undefined) {
            return data.minPrice < data.maxPrice;
        }
        return true;
    },
    'Minimum price must be less than maximum price'
);

/**
 * Schema for product ID validation
 */
export const productIdSchema = z
    .number()
    .int('Product ID must be a whole number')
    .positive('Invalid product ID');
