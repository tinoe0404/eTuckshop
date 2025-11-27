import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { categoryService } from "@/lib/api/services/category.service";
import type { Category } from "@/types/category.types";
import type { ApiResponse } from "@/types/api.types";

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: () => [...categoryKeys.lists()] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

export function useCategories(
  options?: Omit<UseQueryOptions<ApiResponse<Category[]>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => categoryService.getCategories(),
    ...options,
  });
}

export function useCategory(
  id: number,
  options?: Omit<UseQueryOptions<ApiResponse<Category>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoryService.getCategory(id),
    enabled: !!id,
    ...options,
  });
}