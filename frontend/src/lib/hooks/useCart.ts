// ============================================
// FILE: src/lib/hooks/useCart.ts (INTEGRATED)
// ============================================
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
// ✅ Importing your centralized config
import { queryKeys, invalidateCartQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS } from '@/lib/api/queryConfig'; 
import { toast } from 'sonner';
import { CartItem } from '@/types';

// ========================
// QUERY HOOKS
// ========================

/**
 * ✅ Get full cart with items
 * Used on: Cart Page, Checkout
 */
export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.details(),
    queryFn: cartService.getCart,
    ...QUERY_DEFAULTS,
  });
}

/**
 * ✅ Get cart summary (lightweight)
 * Used on: Header Badge
 */
export function useCartSummary() {
  return useQuery({
    queryKey: queryKeys.cart.summary(),
    queryFn: cartService.getCartSummary,
    ...QUERY_DEFAULTS,
    staleTime: 2 * 60 * 1000, // Override default: refresh faster
  });
}

/**
 * ✅ Computed: Total Items
 */
export function useCartCount() {
  const { data } = useCartSummary();
  return data?.data?.totalItems ?? 0;
}

// ========================
// MUTATION HOOKS
// ========================

/**
 * ✅ Add item (Optimistic)
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartService.addToCart,

    onMutate: async (variables) => {
      // 1. Cancel background refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });

      // 2. Snapshot previous summary
      const previousSummary = queryClient.getQueryData(queryKeys.cart.summary());

      // 3. Optimistic Update (Badge Count)
      if (previousSummary) {
        queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
          ...old,
          data: {
            ...old.data,
            totalItems: (old.data?.totalItems ?? 0) + (variables.quantity ?? 1),
          },
        }));
      }

      return { previousSummary };
    },

    onSuccess: () => {
      toast.success('Added to cart');
      invalidateCartQueries(queryClient); // ✅ Uses your helper
    },

    onError: (error: any, _, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.cart.summary(), context.previousSummary);
      }
      toast.error(error?.response?.data?.message || 'Failed to add to cart');
    },
  });
}

/**
 * ✅ Update quantity (Optimistic)
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartService.updateCartItem,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());

      if (previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          if (!old?.data?.items) return old;

          const updatedItems = old.data.items.map((item: CartItem) =>
            item.productId === variables.productId
              ? {
                  ...item,
                  quantity: variables.quantity,
                  subtotal: item.price * variables.quantity,
                }
              : item
          );

          const newTotalAmount = updatedItems.reduce(
            (sum: number, item: CartItem) => sum + item.subtotal,
            0
          );

          return {
            ...old,
            data: {
              ...old.data,
              items: updatedItems,
              totalAmount: newTotalAmount,
            },
          };
        });
      }

      return { previousCart };
    },

    onSuccess: () => {
      invalidateCartQueries(queryClient);
    },

    onError: (error: any, _, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
      }
      toast.error('Failed to update quantity');
    },
  });
}

/**
 * ✅ Remove item (Optimistic)
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartService.removeFromCart,

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());

      if (previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          if (!old?.data?.items) return old;

          const filteredItems = old.data.items.filter(
            (item: CartItem) => item.productId !== productId
          );

          const newTotalItems = filteredItems.reduce(
            (sum: number, item: CartItem) => sum + item.quantity,
            0
          );
          const newTotalAmount = filteredItems.reduce(
            (sum: number, item: CartItem) => sum + item.subtotal,
            0
          );

          return {
            ...old,
            data: {
              ...old.data,
              items: filteredItems,
              totalItems: newTotalItems,
              totalAmount: newTotalAmount,
            },
          };
        });
      }

      return { previousCart };
    },

    onSuccess: () => {
      toast.success('Item removed');
      invalidateCartQueries(queryClient);
    },

    onError: (error: any, _, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
      }
      toast.error('Failed to remove item');
    },
  });
}

/**
 * ✅ Clear Cart (Optimistic)
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartService.clearCart,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());

      // Optimistic wipe
      queryClient.setQueryData(queryKeys.cart.details(), (old: any) => ({
        ...old,
        data: { ...old?.data, items: [], totalItems: 0, totalAmount: 0 },
      }));
      
      queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
        ...old,
        data: { totalItems: 0, totalAmount: 0 },
      }));

      return { previousCart };
    },

    onSuccess: () => {
      toast.success('Cart cleared');
      invalidateCartQueries(queryClient);
    },

    onError: (error: any, _, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
      }
      toast.error('Failed to clear cart');
    },
  });
}