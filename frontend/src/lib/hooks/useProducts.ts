// ============================================
// FILE: src/lib/hooks/useProducts.ts (REFACTORED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '@/lib/http-service/products';
import { queryKeys, invalidateProductQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';

// ========================
// QUERY HOOKS
// ========================

/**
 * ✅ CUSTOMER: Fetch all products
 * - Uses standard staleTime (5min)
 * - Perfect for product catalog
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.lists(),
    queryFn: () => getAllProducts({ limit: 6, sort: 'createdAt', order: 'desc' }),
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ ADMIN: Fetch all products (real-time)
 * - Auto-refreshes every 30s
 * - Critical for inventory management
 */
export function useAdminProducts() {
  return useQuery({
    queryKey: queryKeys.products.lists(),
    queryFn: () => getAllProducts({ limit: 6, sort: 'createdAt', order: 'desc' }),
    ...REALTIME_QUERY_DEFAULTS,
  });
}

/**
 * ✅ Fetch single product by ID
 */
export function useProduct(id: number | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.products.detail(id) : ['products', 'detail', 'null'],
    queryFn: () => getProductById(id!),
    enabled: !!id,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ Fetch products by category
 */
export function useProductsByCategory(categoryId: number | null) {
  return useQuery({
    queryKey: categoryId
      ? queryKeys.products.byCategory(categoryId)
      : ['products', 'category', 'null'],
    queryFn: () => getProductsByCategory(categoryId!),
    enabled: !!categoryId,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ Search products
 */
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: queryKeys.products.list({ search: query }),
    queryFn: () => searchProducts(query),
    enabled: query.length > 0,
    ...QUERY_DEFAULTS,
  });
}

// ========================
// MUTATION HOOKS (ADMIN ONLY)
// ========================

/**
 * ✅ Create product
 * - Invalidates all product queries
 * - Shows success/error toasts
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,

    onSuccess: () => {
      toast.success('Product created successfully');
      invalidateProductQueries(queryClient);
    },

    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create product');
    },
  });
}

/**
 * ✅ Update product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateProduct(id, data),

    onSuccess: (_, variables) => {
      toast.success('Product updated successfully');

      // Invalidate all product lists
      invalidateProductQueries(queryClient);

      // Invalidate specific product detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id)
      });
    },

    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update product');
    },
  });
}

/**
 * ✅ Delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,

    onSuccess: () => {
      toast.success('Product deleted successfully');
      invalidateProductQueries(queryClient);
    },

    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete product');
    },
  });
}

/**
 * ✅ Bulk delete products
 */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map(id => deleteProduct(id))
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`Failed to delete ${failed} product(s)`);
      }

      return results;
    },

    onSuccess: () => {
      toast.success('Products deleted successfully');
      invalidateProductQueries(queryClient);
    },

    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete some products');
    },
  });
}