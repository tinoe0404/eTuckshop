import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { Category } from "@/types/category.types";
import type { ApiResponse } from "@/types/api.types";

class CategoryService {
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      API_ENDPOINTS.CATEGORIES.BASE
    );
    return response.data;
  }

  async getCategory(id: number): Promise<ApiResponse<Category>> {
    const response = await apiClient.get<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES.BY_ID(id)
    );
    return response.data;
  }
}

export const categoryService = new CategoryService();