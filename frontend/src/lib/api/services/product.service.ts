import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { Product, ProductFilters } from "@/types/product.types";
import type { ApiResponse } from "@/types/api.types";

class ProductService {
  async getProducts(filters?: ProductFilters): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    
    if (filters?.categoryId) params.append("categoryId", filters.categoryId.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.minPrice) params.append("minPrice", filters.minPrice.toString());
    if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await apiClient.get<ApiResponse<Product[]>>(
      `${API_ENDPOINTS.PRODUCTS.BASE}?${params.toString()}`
    );
    return response.data;
  }

  async getProduct(id: number): Promise<ApiResponse<Product>> {
    const response = await apiClient.get<ApiResponse<Product>>(
      API_ENDPOINTS.PRODUCTS.BY_ID(id)
    );
    return response.data;
  }

  async getProductsByCategory(categoryId: number): Promise<ApiResponse<Product[]>> {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      API_ENDPOINTS.PRODUCTS.BY_CATEGORY(categoryId)
    );
    return response.data;
  }
}

export const productService = new ProductService();