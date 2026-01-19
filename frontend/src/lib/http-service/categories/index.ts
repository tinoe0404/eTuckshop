import { apiClient } from '../apiClient';
import { createCategorySchema, updateCategorySchema, categoryIdSchema } from './schema';
import type { CreateCategoryPayload, UpdateCategoryPayload, CategoryResponse, CategoryListResponse } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

export async function getAllCategories(): Promise<CategoryListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<CategoryListResponse>>(
            '/categories',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch categories');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get all categories error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch categories');
    }
}

export async function getCategoryById(id: number): Promise<CategoryResponse> {
    try {
        const validatedId = categoryIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<CategoryResponse>>(
            `/categories/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Category not found');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid category ID');
        }

        console.error('Get category by ID error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch category');
    }
}

export async function createCategory(payload: CreateCategoryPayload): Promise<CategoryResponse> {
    try {
        const validated = createCategorySchema.parse(payload);

        const response = await apiClient.post<ApiResponse<CategoryResponse>>(
            '/categories',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to create category');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid category data');
        }

        console.error('Create category error:', error);
        throw error instanceof Error ? error : new Error('Failed to create category');
    }
}

export async function updateCategory(
    id: number,
    payload: UpdateCategoryPayload
): Promise<CategoryResponse> {
    try {
        const validatedId = categoryIdSchema.parse(id);
        const validated = updateCategorySchema.parse(payload);

        const response = await apiClient.put<ApiResponse<CategoryResponse>>(
            `/categories/${validatedId}`,
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update category');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid category data');
        }

        console.error('Update category error:', error);
        throw error instanceof Error ? error : new Error('Failed to update category');
    }
}

export async function deleteCategory(id: number): Promise<{ message: string }> {
    try {
        const validatedId = categoryIdSchema.parse(id);

        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            `/categories/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete category');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid category ID');
        }

        console.error('Delete category error:', error);
        throw error instanceof Error ? error : new Error('Failed to delete category');
    }
}
