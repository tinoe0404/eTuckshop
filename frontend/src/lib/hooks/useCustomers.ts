// ============================================
// FILE: src/hooks/useCustomers.ts (IMPROVED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, Customer } from '@/lib/api/services/customer.service';
import { queryKeys } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, STATIC_QUERY_DEFAULTS, MUTATION_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';

// ========================
// Query Hooks
// ========================

/**
 * ✅ Fetch paginated customers list
 * Uses QUERY_DEFAULTS (5min staleTime) because customer data changes moderately
 * - More frequent than categories (customer actions)
 * - Less frequent than analytics (not realtime)
 */
export function useCustomers(params: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customerService.getAll(params),
    ...QUERY_DEFAULTS, // 5min staleTime, balanced refetch strategy
  });
}

/**
 * ✅ Fetch customer statistics (totals, active/inactive counts)
 * Uses STATIC_QUERY_DEFAULTS (30min staleTime) because stats are aggregated
 * and don't need frequent updates
 */
export function useCustomerStats() {
  return useQuery({
    queryKey: queryKeys.customers.stats(),
    queryFn: customerService.getStats,
    ...STATIC_QUERY_DEFAULTS, // 30min staleTime, only updates on mutations
  });
}

/**
 * ✅ Fetch single customer details
 * Uses QUERY_DEFAULTS (5min staleTime)
 * - Only fetches when id is provided (enabled: !!id)
 */
export function useCustomer(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id!),
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
    ...QUERY_DEFAULTS,
  });
}

// ========================
// Mutation Hooks with Optimistic Updates
// ========================

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    
    ...MUTATION_DEFAULTS, // Smart retry logic (skip 4xx errors)
    
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches for all customer lists
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.stats() });
      
      // Snapshot all customer list queries
      const previousQueries = new Map();
      
      // Get all customer list queries (multiple pages, search states)
      queryClient.getQueriesData({ queryKey: queryKeys.customers.lists() })
        .forEach(([key, data]) => {
          previousQueries.set(JSON.stringify(key), data);
        });
      
      // Snapshot stats
      const previousStats = queryClient.getQueryData(queryKeys.customers.stats());
      
      // Optimistically remove customer from all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.customers.lists() },
        (old: any) => {
          if (!old?.data?.customers) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              customers: old.data.customers.filter(
                (customer: Customer) => customer.id !== deletedId
              ),
              pagination: old.data.pagination
                ? {
                    ...old.data.pagination,
                    total: old.data.pagination.total - 1,
                  }
                : undefined,
            },
          };
        }
      );
      
      // Optimistically update stats
      queryClient.setQueryData(queryKeys.customers.stats(), (old: any) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            totalCustomers: Math.max(0, (old.data.totalCustomers || 0) - 1),
            // Also decrement active/inactive based on customer state
            inactiveCustomers: Math.max(0, (old.data.inactiveCustomers || 0) - 1),
          },
        };
      });
      
      return { previousQueries, previousStats };
    },
    
    onError: (err, deletedId, context) => {
      // Rollback all queries
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.customers.stats(),
          context.previousStats
        );
      }
      
      const message = (err as any).response?.data?.message || 'Failed to delete customer';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Customer deleted successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency across all queries
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}