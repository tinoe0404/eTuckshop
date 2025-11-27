import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { productService } from "@/lib/api/services/product.service";
import type { Product, ProductFilters } from "@/types/product.types";
import type { ApiResponse } from "@/types/api.types";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  byCategory: (categoryId: number) => [...productKeys.all, "category", categoryId] as const,
};

export function useProducts(
  filters?: ProductFilters,
  options?: Omit<UseQueryOptions<ApiResponse<Product[]>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productService.getProducts(filters),
    ...options,
  });
}

export function useProduct(
  id: number,
  options?: Omit<UseQueryOptions<ApiResponse<Product>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
    ...options,
  });
}

export function useProductsByCategory(
  categoryId: number,
  options?: Omit<UseQueryOptions<ApiResponse<Product[]>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: productKeys.byCategory(categoryId),
    queryFn: () => productService.getProductsByCategory(categoryId),
    enabled: !!categoryId,
    ...options,
  });
}