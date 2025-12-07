import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/lib/api/services/category.service';
import { queryKeys } from '@/lib/api/queryKeys';
import { Category } from '@/types';
import { toast } from 'sonner';

// ========================
// Query Hooks
// ========================

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: categoryService.getAll,
  });
}

export function useCategoryStats() {
  return useQuery({
    queryKey: queryKeys.categories.stats(),
    queryFn: categoryService.getStats,
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoryService.getById(id),
    enabled: !!id,
  });
}

// ========================
// Mutation Hooks with Optimistic Updates
// ========================

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      categoryService.create(data),
    
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
        
        const optimisticCategory: Category = {
          id: Date.now(), // Temporary ID
          name: newCategory.name,
          description: newCategory.description || null,
          productCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return {
          ...old,
          data: [...(old.data || []), optimisticCategory],
        };
      });
      
      // Optimistically update stats
      queryClient.setQueryData(queryKeys.categories.stats(), (old: any) => {
        if (!old) return old;
        
        const optimisticStat = {
          id: Date.now(),
          name: newCategory.name,
          description: newCategory.description || null,
          totalProducts: 0,
          totalStock: 0,
          averagePrice: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return {
          ...old,
          data: [...(old.data || []), optimisticStat],
        };
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
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.categories.stats(),
          context.previousStats
        );
      }
      
      const message = (err as any).response?.data?.message || 'Failed to create category';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Category created successfully');
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
      categoryService.update(id, data),
    
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.stats() });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.detail(id) });
      
      // Snapshot previous values
      const previousCategories = queryClient.getQueryData(queryKeys.categories.lists());
      const previousStats = queryClient.getQueryData(queryKeys.categories.stats());
      const previousCategory = queryClient.getQueryData(queryKeys.categories.detail(id));
      
      // Optimistically update categories list
      queryClient.setQueryData(queryKeys.categories.lists(), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          data: (old.data || []).map((cat: Category) =>
            cat.id === id
              ? {
                  ...cat,
                  name: data.name ?? cat.name,
                  description: data.description !== undefined ? data.description : cat.description,
                  updatedAt: new Date().toISOString(),
                }
              : cat
          ),
        };
      });
      
      // Optimistically update stats
      queryClient.setQueryData(queryKeys.categories.stats(), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          data: (old.data || []).map((stat: any) =>
            stat.id === id
              ? {
                  ...stat,
                  name: data.name ?? stat.name,
                  description: data.description !== undefined ? data.description : stat.description,
                  updatedAt: new Date().toISOString(),
                }
              : stat
          ),
        };
      });
      
      // Optimistically update single category
      queryClient.setQueryData(queryKeys.categories.detail(id), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            name: data.name ?? old.data.name,
            description: data.description !== undefined ? data.description : old.data.description,
            updatedAt: new Date().toISOString(),
          },
        };
      });
      
      return { previousCategories, previousStats, previousCategory };
    },
    
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.categories.stats(),
          context.previousStats
        );
      }
      if (context?.previousCategory) {
        queryClient.setQueryData(
          queryKeys.categories.detail(id),
          context.previousCategory
        );
      }
      
      const message = (err as any).response?.data?.message || 'Failed to update category';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Category updated successfully');
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
    mutationFn: (id: number) => categoryService.delete(id),
    
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.stats() });
      
      // Snapshot previous values
      const previousCategories = queryClient.getQueryData(queryKeys.categories.lists());
      const previousStats = queryClient.getQueryData(queryKeys.categories.stats());
      
      // Optimistically remove from categories list
      queryClient.setQueryData(queryKeys.categories.lists(), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          data: (old.data || []).filter((cat: Category) => cat.id !== deletedId),
        };
      });
      
      // Optimistically remove from stats
      queryClient.setQueryData(queryKeys.categories.stats(), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          data: (old.data || []).filter((stat: any) => stat.id !== deletedId),
        };
      });
      
      return { previousCategories, previousStats };
    },
    
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.categories.stats(),
          context.previousStats
        );
      }
      
      const message = (err as any).response?.data?.message || 'Failed to delete category';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Category deleted successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}