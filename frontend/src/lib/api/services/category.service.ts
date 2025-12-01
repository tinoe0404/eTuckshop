import apiClient from '@/lib/api/client';
import { ApiResponse, Category } from '@/types';

export const categoryService = {
  // Get all categories
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return response.data;
  },

  // Get category by ID
  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Category>>(
      `/categories/${id}`
    );
    return response.data;
  },

  // Admin: Create category
  create: async (data: { name: string; description?: string }) => {
    const response = await apiClient.post<ApiResponse<Category>>(
      '/categories',
      data
    );
    return response.data;
  },

  // Admin: Update category
  update: async (id: number, data: { name?: string; description?: string }) => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `/categories/${id}`,
      data
    );
    return response.data;
  },

  // Admin: Delete category
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<{ id: number }>>(
      `/categories/${id}`
    );
    return response.data;
  },

  // Admin: Get category stats
  getStats: async () => {
    const response = await apiClient.get<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          description: string | null;
          totalProducts: number;
          totalStock: number;
          averagePrice: number;
          createdAt: string;
          updatedAt: string;
        }>
      >
    >('/categories/admin/stats');
    return response.data;
  },
};
