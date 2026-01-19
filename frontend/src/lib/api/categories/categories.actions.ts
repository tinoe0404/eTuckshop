'use server';

import { revalidatePath } from 'next/cache';
import { categoriesService } from './categories.client';
import { createCategorySchema, updateCategorySchema, categoryIdSchema } from './categories.schemas';
import type { Category } from './categories.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

export async function getCategoriesAction(): Promise<APIResponse<Category[] | null>> {
    try {
        return await categoriesService.getAll();
    } catch (error) {
        console.error('[getCategoriesAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch categories',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function getCategoryByIdAction(id: number): Promise<APIResponse<Category | null>> {
    try {
        categoryIdSchema.parse(id);
        return await categoriesService.getById(id);
    } catch (error) {
        console.error('[getCategoryByIdAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch category',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function createCategoryAction(prevState: any, formData: FormData): Promise<APIResponse<Category | null>> {
    try {
        const payload = {
            name: formData.get('name') as string,
            description: formData.get('description') as string || null,
        };
        const validated = createCategorySchema.parse(payload);
        const response = await categoriesService.create(validated);
        revalidatePath('/categories');
        revalidatePath('/admin/categories');
        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: error.issues[0]?.message || 'Invalid category data',
                data: null,
                error: error.issues[0]?.message,
            };
        }
        console.error('[createCategoryAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create category',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
