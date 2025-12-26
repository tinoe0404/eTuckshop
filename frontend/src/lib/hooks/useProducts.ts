// ============================================
// FILE: src/lib/hooks/useProducts.ts (REFACTORED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/lib/api/services/product.service';
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
    queryFn: productService.getAll,
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
    queryFn: productService.getAll,
    ...REALTIME_QUERY_DEFAULTS,
  });
}

/**
 * ✅ Fetch single product by ID
 */
export function useProduct(id: number | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.products.detail(id) : ['products', 'detail', 'null'],
    queryFn: () => productService.getById(id!),
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
    queryFn: () => productService.getByCategory(categoryId!),
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
    queryFn: () => productService.searchProducts(query),
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
    mutationFn: productService.create,
    
    onSuccess: () => {
      toast.success('Product created successfully');
      invalidateProductQueries(queryClient);
    },
    
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create product');
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
      productService.update(id, data),
    
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
      toast.error(error?.response?.data?.message || 'Failed to update product');
    },
  });
}

/**
 * ✅ Delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productService.delete,
    
    onSuccess: () => {
      toast.success('Product deleted successfully');
      invalidateProductQueries(queryClient);
    },
    
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete product');
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
        ids.map(id => productService.delete(id))
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