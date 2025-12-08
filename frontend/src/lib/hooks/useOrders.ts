import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { queryKeys } from '@/lib/api/queryKeys';
import { Order } from '@/types';
import { toast } from 'sonner';

// ========================
// Query Hooks
// ========================

export function useOrders(params: {
  status?: string;
  paymentType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getAllOrders(params),
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: orderService.getOrderStats,
  });
}

export function useOrder(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id!),
    queryFn: () => orderService.getOrderById(id!),
    enabled: !!id,
  });
}

export function useUserOrders() {
  return useQuery({
    queryKey: queryKeys.orders.userOrders(),
    queryFn: orderService.getUserOrders,
  });
}

// ========================
// Mutation Hooks with Optimistic Updates
// ========================

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    
    onMutate: async (orderId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.stats() });
      
      // Snapshot all order list queries
      const previousQueries = new Map();
      queryClient.getQueriesData({ queryKey: queryKeys.orders.lists() })
        .forEach(([key, data]) => {
          previousQueries.set(JSON.stringify(key), data);
        });
      
      // Snapshot stats
      const previousStats = queryClient.getQueryData(queryKeys.orders.stats());
      
      // Optimistically update order status in all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.lists() },
        (old: any) => {
          if (!old?.data?.orders) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              orders: old.data.orders.map((order: Order) =>
                order.id === orderId
                  ? {
                      ...order,
                      status: 'COMPLETED',
                      completedAt: new Date().toISOString(),
                    }
                  : order
              ),
            },
          };
        }
      );
      
      // Optimistically update stats
      queryClient.setQueryData(queryKeys.orders.stats(), (old: any) => {
        if (!old?.data) return old;
        
        // Find the order to update stats correctly
        const allOrders = queryClient.getQueriesData({ queryKey: queryKeys.orders.lists() });
        const order = allOrders
          .flatMap(([_, data]: any) => data?.data?.orders || [])
          .find((o: Order) => o.id === orderId);
        
        if (!order) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            orders: {
              ...old.data.orders,
              pending: order.status === 'PENDING' ? old.data.orders.pending - 1 : old.data.orders.pending,
              paid: order.status === 'PAID' ? old.data.orders.paid - 1 : old.data.orders.paid,
              completed: old.data.orders.completed + 1,
            },
          },
        };
      });
      
      return { previousQueries, previousStats };
    },
    
    onError: (err, orderId, context) => {
      // Rollback all queries
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.orders.stats(), context.previousStats);
      }
      
      const message = (err as any).response?.data?.message || 'Failed to complete order';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Order completed successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useRejectOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      orderService.rejectOrder(orderId, reason),
    
    onMutate: async ({ orderId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.stats() });
      
      // Snapshot all order list queries
      const previousQueries = new Map();
      queryClient.getQueriesData({ queryKey: queryKeys.orders.lists() })
        .forEach(([key, data]) => {
          previousQueries.set(JSON.stringify(key), data);
        });
      
      // Snapshot stats
      const previousStats = queryClient.getQueryData(queryKeys.orders.stats());
      
      // Optimistically update order status in all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.lists() },
        (old: any) => {
          if (!old?.data?.orders) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              orders: old.data.orders.map((order: Order) =>
                order.id === orderId
                  ? {
                      ...order,
                      status: 'CANCELLED',
                    }
                  : order
              ),
            },
          };
        }
      );
      
      // Optimistically update stats
      queryClient.setQueryData(queryKeys.orders.stats(), (old: any) => {
        if (!old?.data) return old;
        
        // Find the order to update stats correctly
        const allOrders = queryClient.getQueriesData({ queryKey: queryKeys.orders.lists() });
        const order = allOrders
          .flatMap(([_, data]: any) => data?.data?.orders || [])
          .find((o: Order) => o.id === orderId);
        
        if (!order) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            orders: {
              ...old.data.orders,
              pending: order.status === 'PENDING' ? old.data.orders.pending - 1 : old.data.orders.pending,
              paid: order.status === 'PAID' ? old.data.orders.paid - 1 : old.data.orders.paid,
              cancelled: old.data.orders.cancelled + 1,
            },
          },
        };
      });
      
      return { previousQueries, previousStats };
    },
    
    onError: (err, { orderId }, context) => {
      // Rollback all queries
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.orders.stats(), context.previousStats);
      }
      
      const message = (err as any).response?.data?.message || 'Failed to reject order';
      toast.error(message);
    },
    
    onSuccess: (response) => {
      toast.success(response.message || 'Order rejected successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}