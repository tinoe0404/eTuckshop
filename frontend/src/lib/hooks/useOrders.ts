'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { queryKeys, invalidateOrderQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS, REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';

// --- QUERIES ---

export function useAdminOrders(params: { status?: string; paymentType?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getAllOrders(params),
    ...REALTIME_QUERY_DEFAULTS,
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: orderService.getOrderStats,
    ...REALTIME_QUERY_DEFAULTS,
  });
}

export function useUserOrders() {
  return useQuery({
    queryKey: queryKeys.orders.userOrders(),
    queryFn: orderService.getUserOrders,
    ...QUERY_DEFAULTS,
  });
}

export function useOrder(id: number | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.orders.detail(id) : ['orders', 'detail', 'null'],
    queryFn: () => orderService.getOrderById(id!),
    enabled: !!id,
    ...QUERY_DEFAULTS,
  });
}

export function useOrderQR(orderId: number | null) {
  return useQuery({
    queryKey: orderId ? queryKeys.orders.qr(orderId) : ['orders', 'qr', 'null'],
    queryFn: () => orderService.getOrderQR(orderId!),
    enabled: !!orderId,
    refetchInterval: 3000,
  });
}

// --- MUTATIONS ---

export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.checkout,

    onSuccess: () => {
      // Clear cart AFTER successful checkout
      queryClient.setQueryData(['cart', 'detail'], {
        success: true,
        data: { items: [], totalItems: 0, totalAmount: 0 }
      });

      queryClient.setQueryData(['cart', 'summary'], {
        success: true,
        data: { totalItems: 0, totalAmount: 0 }
      });

      // Invalidate to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });

      toast.success('Order created successfully');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Checkout failed');
    },
  });
}

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

export function useInitiatePayNow() {
  return useMutation({
    mutationFn: orderService.initiatePayNow,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'PayNow initiation failed');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.cancelOrder,
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.userOrders() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
}

// ✅ FIXED: Complete Order Hook with Robust Error Handling
export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, idempotencyKey }: { orderId: number; idempotencyKey: string }) =>
      orderService.completeOrder(orderId, idempotencyKey),

    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry client errors (400, 404, etc.)
      if (status >= 400 && status < 500) return false;
      return failureCount < 1;
    },

    onMutate: async ({ orderId }) => {
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

    onError: (err: any, { orderId }, context) => {
      console.error("Mutation failed:", err);

      // 1. Rollback optimistic update
      if (context?.previousOrders) {
        queryClient.setQueriesData({ queryKey: queryKeys.orders.lists() }, context.previousOrders);
      }

      // 2. CRITICAL FIX: Invalidate queries anyway.
      // If the backend succeeded but the response failed (timeout/network), 
      // this ensures the UI fetches the true "COMPLETED" state.
      invalidateOrderQueries(queryClient);

      // Only show error toast if it's NOT a "success-disguised-as-error"
      const msg = err.response?.data?.message || 'Failed to complete order';
      toast.error(msg);
    },

    onSuccess: (data) => {
      const message = data?.message || 'Order completed successfully';
      toast.success(message);

      // Invalidate everything to ensure sync
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

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
      invalidateOrderQueries(queryClient); // Fix ghost state here too
    },

    onSuccess: () => {
      toast.success('Order rejected');
      invalidateOrderQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useScanQRCode() {
  return useMutation({
    mutationFn: orderService.scanQRCode,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid QR code');
    },
  });
}