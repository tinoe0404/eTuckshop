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
    // Wrapper to accept product details but only send necessary data to API
    mutationFn: (variables: { productId: number; quantity?: number; product?: any }) => {
      const { product, ...apiData } = variables;
      return cartService.addToCart(apiData);
    },

    onMutate: async (variables) => {
      // 1. Cancel background refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });

      // 2. Snapshot previous data
      const previousSummary = queryClient.getQueryData(queryKeys.cart.summary());
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());

      // 3. Optimistic Update (Badge Count)
      // 3. Optimistic Update (Badge Count)
      queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => {
        const currentData = old?.data || { totalItems: 0, totalAmount: 0 };
        const qtyToAdd = variables.quantity ?? 1;
        const price = variables.product?.price || 0;

        return {
          ...old,
          success: true,
          data: {
            ...currentData,
            totalItems: (currentData.totalItems || 0) + qtyToAdd,
            totalAmount: (currentData.totalAmount || 0) + (price * qtyToAdd),
          },
        };
      });

      // 4. Optimistic Update (Cart List)
      if (previousCart && variables.product) {
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          if (!old?.data) return old;

          const existingItemIndex = old.data.items.findIndex(
            (item: CartItem) => item.productId === variables.productId
          );

          let newItems;
          const qtyToAdd = variables.quantity ?? 1;

          if (existingItemIndex >= 0) {
            // Update existing item
            newItems = [...old.data.items];
            const item = newItems[existingItemIndex];
            newItems[existingItemIndex] = {
              ...item,
              quantity: item.quantity + qtyToAdd,
              subtotal: item.subtotal + (item.price * qtyToAdd),
            };
          } else {
            // Add new item
            // Construct a temporary ID (negative to avoid collision, or just use timestamp)
            const newItem: CartItem = {
              id: -Date.now(),
              cartId: old.data.id || 0,
              productId: variables.productId,
              name: variables.product.name,
              description: variables.product.description,
              quantity: qtyToAdd,
              price: variables.product.price,
              subtotal: variables.product.price * qtyToAdd,
              product: variables.product,
              stock: variables.product.stock,
              stockLevel: variables.product.stockLevel || (variables.product.stock > 10 ? 'HIGH' : 'LOW'),
              category: variables.product.category,
              image: variables.product.image,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            newItems = [newItem, ...old.data.items];
          }

          // Recalculate totals
          const newTotalAmount = newItems.reduce((sum: number, i: any) => sum + i.subtotal, 0);
          const newTotalItems = newItems.reduce((sum: number, i: any) => sum + i.quantity, 0);

          return {
            ...old,
            data: {
              ...old.data,
              items: newItems,
              totalItems: newTotalItems,
              totalAmount: newTotalAmount,
            },
          };
        });
      }

      return { previousSummary, previousCart };
    },

    onSuccess: () => {
      toast.success('Added to cart');
      invalidateCartQueries(queryClient);
    },

    onError: (error: any, _, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.cart.summary(), context.previousSummary);
      }
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
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
        let newTotalItems = 0;
        let newTotalAmount = 0;

        // 1. Update Details
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

          newTotalAmount = updatedItems.reduce(
            (sum: number, item: CartItem) => sum + item.subtotal,
            0
          );
          newTotalItems = updatedItems.reduce(
            (sum: number, item: CartItem) => sum + item.quantity,
            0
          );

          return {
            ...old,
            data: {
              ...old.data,
              items: updatedItems,
              totalAmount: newTotalAmount,
              totalItems: newTotalItems,
            },
          };
        });

        // 2. Update Summary (Badge)
        queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
          ...old,
          data: {
            ...old?.data,
            totalItems: newTotalItems,
            totalAmount: newTotalAmount,
          },
        }));
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
        let newTotalItems = 0;
        let newTotalAmount = 0;

        // 1. Update Details
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          if (!old?.data?.items) return old;

          const filteredItems = old.data.items.filter(
            (item: CartItem) => item.productId !== productId
          );

          newTotalItems = filteredItems.reduce(
            (sum: number, item: CartItem) => sum + item.quantity,
            0
          );
          newTotalAmount = filteredItems.reduce(
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

        // 2. Update Summary (Badge)
        queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
          ...old,
          data: {
            ...old?.data,
            totalItems: newTotalItems,
            totalAmount: newTotalAmount,
          },
        }));
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