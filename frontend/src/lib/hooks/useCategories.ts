// ============================================
// FILE: src/hooks/useCategories.ts (REFACTORED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} from '@/lib/http-service/categories';
import { queryKeys } from '@/lib/api/queryKeys';
import { STATIC_QUERY_DEFAULTS, MUTATION_DEFAULTS } from '@/lib/api/queryConfig';
import { Category } from '@/lib/http-service/categories/types';
import { toast } from 'sonner';

// ========================
// Query Hooks
// ========================

/**
 * ✅ Fetch all categories
 * Uses STATIC_QUERY_DEFAULTS because categories rarely change
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: getAllCategories,
    ...STATIC_QUERY_DEFAULTS, // 30min staleTime, only refetch on explicit action
  });
}

/**
 * ✅ Fetch category statistics (product counts, stock, etc.)
 * Uses STATIC_QUERY_DEFAULTS - stats update when categories/products change
 */
export function useCategoryStats() {
  return useQuery({
    queryKey: queryKeys.categories.stats(),
    queryFn: getCategoryStats,
    ...STATIC_QUERY_DEFAULTS,
  });
}

/**
 * ✅ Fetch single category by ID
 * Uses STATIC_QUERY_DEFAULTS
 */
export function useCategory(id: number) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
    ...STATIC_QUERY_DEFAULTS,
  });
}

// ========================
// Mutation Hooks with Optimistic Updates
// ========================

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,

    ...MUTATION_DEFAULTS, // Smart retry logic

    onMutate: async (newCategory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.stats() });

      // Snapshot previous values
      const previousCategories = queryClient.getQueryData(queryKeys.categories.lists());
      const previousStats = queryClient.getQueryData(queryKeys.categories.stats());

      // Optimistically update categories list
      queryClient.setQueryData(queryKeys.categories.lists(), (old: any) => {
        if (!old) return old;

        const optimisticCategory = {
          id: Date.now(), // Temporary ID
          name: newCategory.name,
          description: newCategory.description || null,
          productCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as Category;

        return [...(old || []), optimisticCategory];
      });

      return { previousCategories, previousStats };
    },

    onError: (err, newCategory, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }

      const message = (err as any).message || 'Failed to create category';
      toast.error(message);
    },

    onSuccess: (response) => {
      toast.success('Category created successfully');
    },

    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      updateCategory(id, data),

    ...MUTATION_DEFAULTS,

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.detail(id) });

      // Snapshot previous values
      const previousCategories = queryClient.getQueryData(queryKeys.categories.lists());
      const previousCategory = queryClient.getQueryData(queryKeys.categories.detail(id));

      // Optimistically update categories list
      queryClient.setQueryData(queryKeys.categories.lists(), (old: any) => {
        if (!old) return old;

        return (old || []).map((cat: Category) =>
          cat.id === id
            ? {
              ...cat,
              name: data.name ?? cat.name,
              description: data.description !== undefined ? data.description : cat.description,
              updatedAt: new Date().toISOString(),
            }
            : cat
        );
      });

      return { previousCategories, previousCategory };
    },

    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
      if (context?.previousCategory) {
        queryClient.setQueryData(
          queryKeys.categories.detail(id),
          context.previousCategory
        );
      }

      const message = (err as any).message || 'Failed to update category';
      toast.error(message);
    },

    onSuccess: () => {
      toast.success('Category updated successfully');
    },

    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),

    ...MUTATION_DEFAULTS,

    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.lists() });

      // Snapshot previous values
      const previousCategories = queryClient.getQueryData(queryKeys.categories.lists());

      // Optimistically remove from categories list
      queryClient.setQueryData(queryKeys.categories.lists(), (old: any) => {
        if (!old) return old;
        return (old || []).filter((cat: Category) => cat.id !== deletedId);
      });

      return { previousCategories };
    },

    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }

      const message = (err as any).message || 'Failed to delete category';
      toast.error(message);
    },

    onSuccess: () => {
      toast.success('Category deleted successfully');
    },

    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}