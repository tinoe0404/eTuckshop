import { ApiResponse, Category } from "@/types";
import apiClient from '@/lib/api/client';

export const categoryService = {
  // Get all categories
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Category[]>>("/categories");
    return response.data.data; // return actual category array
  },

  // Get category by ID
  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Category>>(
      `/categories/${id}`
    );
    return response.data.data;
  },

  // Admin: Create category
  create: async (data: { name: string; description?: string }) => {
    const response = await apiClient.post<ApiResponse<Category>>(
      "/categories",
      data
    );
    return response.data.data;
  },

  // Admin: Update category
  update: async (id: number, data: { name?: string; description?: string }) => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `/categories/${id}`,
      data
    );
    return response.data.data;
  },

  // Admin: Delete category
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<{ id: number }>>(
      `/categories/${id}`
    );
    return response.data.data;
  },

  // Admin: Get category stats
  getStats: async () => {
    const response = await apiClient.get<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          totalProducts: number;
          totalStock: number;
          averagePrice: number;
        }>
      >
    >("/categories/admin/stats");

    return response.data.data;
  },
};
