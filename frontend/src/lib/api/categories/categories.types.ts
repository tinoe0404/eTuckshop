import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from './categories.schemas';

export type CategoryId = number & { readonly __brand: 'CategoryId' };

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

export type Category = {
    readonly id: CategoryId;
    readonly name: string;
    readonly description: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type CategoryResponse = Category;
export type CategoryListResponse = readonly Category[];
