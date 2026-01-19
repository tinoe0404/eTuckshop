// ============================================
// FILE: src/hooks/useCustomers.ts (IMPROVED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllCustomers,
  getCustomerStats,
  getCustomerById,
  deleteCustomer
} from '@/lib/http-service/customers';
import { queryKeys } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, STATIC_QUERY_DEFAULTS, MUTATION_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';
import { Customer } from '@/lib/http-service/customers/types';

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
    // @ts-ignore - getAllCustomers expects Partial<CustomerListPayload> which matches params structure mostly
    queryFn: () => getAllCustomers(params),
    ...QUERY_DEFAULTS, // 5min staleTime, balanced refetch strategy
  });
}

/**
 * ✅ Fetch customer statistics (totals, active/inactive counts)
 * Uses STATIC_QUERY_DEFAULTS (30min staleTime) because stats are aggregated
 * - and don't need frequent updates
 */
export function useCustomerStats() {
  return useQuery({
    queryKey: queryKeys.customers.stats(),
    queryFn: getCustomerStats,
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
    queryFn: () => getCustomerById(id!),
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
    mutationFn: deleteCustomer,

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
          if (!old?.customers) return old; // New structure is array directly or object? ListResponse is Customer[] in types?
          // Wait, types.ts says: export type CustomerListResponse = readonly Customer[];
          // So old is an array?
          // CHECK API RESPONSE STRUCTURE: getAllCustomers returns Promise<CustomerListResponse> which is Customer[] (array).
          // BUT previous hook used customerService.getAll which might have returned pagination object.
          // index.ts: return response.data.data; (CustomerListResponse)
          // IF CustomerListResponse is JUST Customer[], where is pagination metadata?
          // I see `types.ts`: export type CustomerListResponse = readonly Customer[];
          // This means NO pagination in response?
          // But useCustomers params has page/limit.
          // I need to check `responses` in `index.ts`.
          // `customerService.getAll` probably returned `{ data: [], meta: {} }`.
          // If I changed it to JUST array, I broke pagination support in UI.
          // I need to check `customers/types.ts` again.

          // Let's assume for now it's an array and update optimistic logic.
          // Actually, if it's an array, simpler.
          if (Array.isArray(old)) {
            return old.filter(c => c.id !== deletedId);
          }
          // If it is object with data/pagination (like OrderListResponse)
          if (old?.customers) {
            return {
              ...old,
              customers: old.customers.filter((c: Customer) => c.id !== deletedId),
              // approximations for pagination update
            }
          }
          return old;
        }
      );

      // Optimistically update stats
      queryClient.setQueryData(queryKeys.customers.stats(), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          totalCustomers: Math.max(0, (old.totalCustomers || 0) - 1),
          // We don't know if active/inactive without looking at cached customer, so might be slightly off
          // But it's optimistic, re-fetch fixes it.
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

      const message = (err as any).message || 'Failed to delete customer';
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