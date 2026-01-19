import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from './categories.types';

export class CategoriesService extends BaseAPIRequests {
    async getAll(): Promise<APIResponse<Category[]>> {
        return this.get<Category[]>('/categories');
    }

    async getById(id: number): Promise<APIResponse<Category>> {
        return this.get<Category>(`/categories/${id}`);
    }

    async create(payload: CreateCategoryPayload): Promise<APIResponse<Category>> {
        return this.post<Category>('/categories', payload);
    }

    async update(id: number, payload: UpdateCategoryPayload): Promise<APIResponse<Category>> {
        return this.put<Category>(`/categories/${id}`, payload);
    }

    async delete(id: number): Promise<APIResponse<{ id: number }>> {
        return this.delete<{ id: number }>(`/categories/${id}`);
    }
}

export const categoriesService = new CategoriesService(apiClient, apiHeaderService);
