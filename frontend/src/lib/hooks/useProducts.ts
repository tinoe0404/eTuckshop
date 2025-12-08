import { useQuery } from '@tanstack/react-query';
import { productService } from '@/lib/api/services/product.service';
import { queryKeys } from '@/lib/api/queryKeys';

// ========================
// Query Hooks
// ========================

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.lists(),
    queryFn: productService.getAll,
  });
}

export function useProduct(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => productService.getById(id!),
    enabled: !!id,
  });
}