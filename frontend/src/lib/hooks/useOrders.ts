// ============================================
// FILE: src/lib/hooks/useOrders.ts
// ============================================
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { queryKeys, invalidateOrderQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';

// ========================
// QUERY HOOKS
// ========================

/**
 * ✅ ADMIN: Fetch all orders (Real-time)
 */
export function useAdminOrders(params: { status?: string; paymentType?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getAllOrders(params),
    ...REALTIME_QUERY_DEFAULTS,
  });
}

/**
 * ✅ ADMIN: Dashboard Stats (Real-time)
 */
export function useOrderStats() {
  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: orderService.getOrderStats,
    ...REALTIME_QUERY_DEFAULTS,
  });
}

/**
 * ✅ CUSTOMER: Fetch My Orders
 */
export function useUserOrders() {
  return useQuery({
    queryKey: queryKeys.orders.userOrders(),
    queryFn: orderService.getUserOrders,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ SHARED: Fetch Single Order
 */
export function useOrder(id: number | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.orders.detail(id) : ['orders', 'detail', 'null'],
    queryFn: () => orderService.getOrderById(id!),
    enabled: !!id,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ SHARED: Poll QR Code Status
 */
export function useOrderQR(orderId: number | null) {
  return useQuery({
    queryKey: orderId ? queryKeys.orders.qr(orderId) : ['orders', 'qr', 'null'],
    queryFn: () => orderService.getOrderQR(orderId!),
    enabled: !!orderId,
    refetchInterval: 3000, // Poll every 3s to check if payment is complete
  });
}

// ========================
// MUTATION HOOKS
// ========================

/**
 * ✅ Checkout
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.checkout,
    onSuccess: () => {
      // Clear cart and refresh orders list
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Checkout failed');
    },
  });
}

/**
 * ✅ Generate Cash QR
 */
export function useGenerateCashQR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.generateCashQR,
    onSuccess: (_, orderId) => {
      toast.success('QR Code generated');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.qr(orderId) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate QR');
    },
  });
}

/**
 * ✅ Initiate PayNow
 */
export function useInitiatePayNow() {
  return useMutation({
    mutationFn: orderService.initiatePayNow,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'PayNow initiation failed');
    },
  });
}

/**
 * ✅ Cancel Order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.cancelOrder,
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock released
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.completeOrder,
    
    // ✅ Don't retry 400 errors (validation failures)
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      
      // Don't retry client errors
      if (status >= 400 && status < 500) {
        return false;
      }
      
      // Retry server errors once
      return failureCount < 1;
    },
    
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      const previousOrders = queryClient.getQueryData(queryKeys.orders.lists());

      // Optimistic update
      queryClient.setQueriesData({ queryKey: queryKeys.orders.lists() }, (old: any) => {
        if (!old?.data?.orders) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: old.data.orders.map((o: any) => 
              o.id === orderId ? { ...o, status: 'COMPLETED', completedAt: new Date().toISOString() } : o
            ),
          },
        };
      });

      return { previousOrders };
    },
    
    onError: (err, orderId, context) => {
      // Rollback optimistic update
      if (context?.previousOrders) {
        queryClient.setQueriesData({ queryKey: queryKeys.orders.lists() }, context.previousOrders);
      }
      
      const errorMessage = (err as any).response?.data?.message || 'Failed to complete order';
      
      // ✅ Don't show error toast for "already completed" (it's actually success)
      if (errorMessage.includes('already completed')) {
        console.log('ℹ️ Order was already completed');
        toast.success('Order already completed');
        
        // Treat as success - invalidate queries
        invalidateOrderQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        // Real error - show toast
        toast.error(errorMessage);
      }
    },
    
    onSuccess: (data) => {
      const message = data?.message || 'Order completed successfully';
      
      // ✅ Show appropriate toast
      if (message.includes('already completed')) {
        toast.success('Order already completed');
      } else {
        toast.success('Order completed successfully');
      }
      
      // Invalidate all order-related queries
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // ✅ Updates stock
    },
  });
}

/**
 * ✅ ADMIN: Reject Order (Optimistic)
 */
export function useRejectOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) => 
      orderService.rejectOrder(orderId, reason),
    
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      const previousOrders = queryClient.getQueryData(queryKeys.orders.lists());

      queryClient.setQueriesData({ queryKey: queryKeys.orders.lists() }, (old: any) => {
        if (!old?.data?.orders) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: old.data.orders.map((o: any) => 
              o.id === orderId ? { ...o, status: 'CANCELLED' } : o
            ),
          },
        };
      });

      return { previousOrders };
    },
    
    onError: (err, _, context) => {
      if (context?.previousOrders) {
        queryClient.setQueriesData({ queryKey: queryKeys.orders.lists() }, context.previousOrders);
      }
      toast.error((err as any).response?.data?.message || 'Failed to reject order');
    },
    
    onSuccess: () => {
      toast.success('Order rejected');
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * ✅ ADMIN: Scan QR
 */
export function useScanQRCode() {
  return useMutation({
    mutationFn: orderService.scanQRCode,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid QR code');
    },
  });
}