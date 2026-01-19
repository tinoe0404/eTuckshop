import { z } from 'zod';

/**
 * Schema for creating a new product
 * Admin-only operation
 */
export const createProductSchema = z.object({
    name: z
        .string({ required_error: 'Product name is required' })
        .trim()
        .min(2, { message: 'Product name must be at least 2 characters' })
        .max(100, { message: 'Product name must not exceed 100 characters' }),

    description: z
        .string()
        .trim()
        .max(1000, { message: 'Description must not exceed 1000 characters' })
        .optional()
        .nullable(),

    price: z
        .number({ required_error: 'Price is required' })
        .positive({ message: 'Price must be greater than 0' })
        .max(1000000, { message: 'Price must not exceed 1,000,000' })
        .refine((val) => Number.isFinite(val), {
            message: 'Price must be a valid number',
        })
        .refine((val) => {
            // Check if has at most 2 decimal places
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
        }, {
            message: 'Price must have at most 2 decimal places',
        }),

    stock: z
        .number({ required_error: 'Stock quantity is required' })
        .int({ message: 'Stock must be a whole number' })
        .min(0, { message: 'Stock cannot be negative' })
        .max(100000, { message: 'Stock must not exceed 100,000' }),

    categoryId: z
        .number({ required_error: 'Category is required' })
        .int({ message: 'Category ID must be a whole number' })
        .positive({ message: 'Invalid category ID' }),

    image: z
        .string()
        .url({ message: 'Image must be a valid URL' })
        .max(500, { message: 'Image URL must not exceed 500 characters' })
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
        .max(100, { message: 'Search query must not exceed 100 characters' })
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
        .min(1, { message: 'Limit must be at least 1' })
        .max(100, { message: 'Limit must not exceed 100' })
        .optional()
        .default(20),

    page: z
        .number()
        .int()
        .min(1, { message: 'Page must be at least 1' })
        .optional()
        .default(1),

    sort: z
        .enum(['name', 'price', 'stock', 'createdAt'], {
            errorMap: () => ({ message: 'Invalid sort field' }),
        })
        .optional()
        .default('createdAt'),

    order: z
        .enum(['asc', 'desc'], {
            errorMap: () => ({ message: 'Order must be asc or desc' }),
        })
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
    {
        message: 'Minimum price must be less than maximum price',
        path: ['minPrice'],
    }
);

/**
 * Schema for product ID validation
 */
export const productIdSchema = z
    .number({ required_error: 'Product ID is required' })
    .int({ message: 'Product ID must be a whole number' })
    .positive({ message: 'Invalid product ID' });
