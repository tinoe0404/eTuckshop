// ============================================
// FILE: src/lib/hooks/useOrders.ts (REFACTORED)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { queryKeys, invalidateOrderQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';

// ========================
// QUERY HOOKS
// ========================

/**
 * ✅ ADMIN: Fetch all orders with filters (real-time)
 * - Auto-refreshes every 30s
 * - Critical for order management
 * - Server-side filtering (NOT client-side)
 */
export function useAdminOrders(params: {
  status?: string;
  paymentType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getAllOrders(params),
    ...REALTIME_QUERY_DEFAULTS, // ✅ Auto-refresh for admin
  });
}

/**
 * ✅ ADMIN: Fetch order stats (real-time)
 * - Dashboard metrics
 * - Auto-refreshes every 30s
 */
export function useOrderStats() {
  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: orderService.getOrderStats,
    ...REALTIME_QUERY_DEFAULTS, // ✅ Always fresh stats
  });
}

/**
 * ✅ Fetch single order by ID
 * - Used in order detail pages
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
 * ✅ CUSTOMER: Fetch user's orders
 * - Standard caching (5min staleTime)
 */
export function useUserOrders() {
  return useQuery({
    queryKey: queryKeys.orders.userOrders(),
    queryFn: orderService.getUserOrders,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ Fetch order QR code
 * - Real-time to check expiry status
 */
export function useOrderQR(orderId: number | null) {
  return useQuery({
    queryKey: orderId ? queryKeys.orders.qr(orderId) : ['orders', 'qr', 'null'],
    queryFn: () => orderService.getOrderQR(orderId!),
    enabled: !!orderId,
    ...REALTIME_QUERY_DEFAULTS, // ✅ Check QR expiry in real-time
  });
}

// ========================
// MUTATION HOOKS
// ========================

/**
 * ✅ Checkout mutation
 * - Clears cart after success
 * - Invalidates order queries
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { paymentType: 'CASH' | 'PAYNOW' }) =>
      orderService.checkout(data),
    
    onSuccess: () => {
      // Invalidate cart (it's now empty)
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      // Invalidate user orders (new order created)
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });
      
      // Don't show toast here - let the page handle routing
    },
    
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to checkout');
    },
  });
}

/**
 * ✅ ADMIN: Complete order mutation
 * - Optimistic updates for instant UI
 * - Rollback on error
 */
export function useCompleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    
    // ✅ Optimistic update
    onMutate: async (orderId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      
      // Snapshot previous state
      const previousOrders = queryClient.getQueryData(queryKeys.orders.lists());
      
      // Optimistically update order status
      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.lists() },
        (old: any) => {
          if (!old?.data?.orders) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              orders: old.data.orders.map((order: any) =>
                order.id === orderId
                  ? { ...order, status: 'COMPLETED', completedAt: new Date().toISOString() }
                  : order
              ),
            },
          };
        }
      );
      
      return { previousOrders };
    },
    
    // ✅ Rollback on error
    onError: (err, orderId, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(queryKeys.orders.lists(), context.previousOrders);
      }
      toast.error((err as any).response?.data?.message || 'Failed to complete order');
    },
    
    onSuccess: () => {
      toast.success('Order completed successfully');
      
      // Invalidate to sync with server
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // ✅ Stock changed
    },
  });
}

/**
 * ✅ ADMIN: Reject order mutation
 */
export function useRejectOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      orderService.rejectOrder(orderId, reason),
    
    // ✅ Optimistic update
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      
      const previousOrders = queryClient.getQueryData(queryKeys.orders.lists());
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.lists() },
        (old: any) => {
          if (!old?.data?.orders) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              orders: old.data.orders.map((order: any) =>
                order.id === orderId
                  ? { ...order, status: 'CANCELLED' }
                  : order
              ),
            },
          };
        }
      );
      
      return { previousOrders };
    },
    
    onError: (err, { orderId }, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(queryKeys.orders.lists(), context.previousOrders);
      }
      toast.error((err as any).response?.data?.message || 'Failed to reject order');
    },
    
    onSuccess: () => {
      toast.success('Order rejected successfully');
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // ✅ Stock restored
    },
  });
}

/**
 * ✅ Cancel order mutation (customer)
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),
    
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // ✅ Stock restored
    },
    
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
}

/**
 * ✅ Generate cash QR mutation
 */
export function useGenerateCashQR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: number) => orderService.generateCashQR(orderId),
    
    onSuccess: (data, orderId) => {
      // Invalidate specific order to show QR
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.qr(orderId) });
    },
    
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    },
  });
}

/**
 * ✅ Initiate PayNow mutation
 */
export function useInitiatePayNow() {
  return useMutation({
    mutationFn: (orderId: number) => orderService.initiatePayNow(orderId),
    
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    },
  });
}

/**
 * ✅ ADMIN: Scan QR code mutation
 */
export function useScanQRCode() {
  return useMutation({
    mutationFn: (qrData: string) => orderService.scanQRCode(qrData),
    
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid QR code');
    },
  });
}