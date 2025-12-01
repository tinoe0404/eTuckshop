import apiClient from '@/lib/api/client';
import { ApiResponse, Product } from '@/types';

export const productService = {
  // Get all products
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products');
    return response.data;
  },

  // Get product by ID
  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/products/${id}`
    );
    return response.data;
  },

  // Get products by category
  getByCategory: async (categoryId: number) => {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      `/products/category/${categoryId}`
    );
    return response.data;
  },

  // Search products
  searchProducts: async (query: string) => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products', {
      params: { search: query },
    });
    return response.data;
  },

  // Admin: Create product
  create: async (data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
    image?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<Product>>(
      '/products',
      data
    );
    return response.data;
  },

  // Admin: Update product
  update: async (id: number, data: Partial<Product>) => {
    const response = await apiClient.put<ApiResponse<Product>>(
      `/products/${id}`,
      data
    );
    return response.data;
  },

  // Admin: Delete product
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<{ id: number }>>(
      `/products/${id}`
    );
    return response.data;
  },
};