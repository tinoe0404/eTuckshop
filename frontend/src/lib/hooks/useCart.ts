// ============================================
// FILE: src/lib/hooks/useCart.ts
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
import { queryKeys, invalidateCartQueries } from '@/lib/api/queryKeys';
import { QUERY_DEFAULTS } from '@/lib/api/queryConfig';
import { toast } from 'sonner';
import { Cart, CartItem } from '@/types';

// ========================
// QUERY HOOKS
// ========================

/**
 * ✅ Get full cart with items
 * - Includes all cart items with product details
 * - Used on cart page and checkout
 * 
 * @example
 * const { data, isLoading } = useCart();
 * const cart = data?.data;
 * const items = cart?.items || [];
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
 * - Only returns { totalItems, totalAmount }
 * - Used in header badge
 * - Much faster than full cart query
 * 
 * @example
 * const { data } = useCartSummary();
 * const totalItems = data?.data?.totalItems ?? 0;
 */
export function useCartSummary() {
  return useQuery({
    queryKey: queryKeys.cart.summary(),
    queryFn: cartService.getCartSummary,
    ...QUERY_DEFAULTS,
    staleTime: 2 * 60 * 1000, // 2 minutes (refresh more often than default)
  });
}

/**
 * ✅ COMPUTED: Get total items from cart
 * - Derives from React Query cache
 * - No Zustand needed!
 * - This replaces the old `useCartStore().totalItems`
 * 
 * @example
 * const totalItems = useCartCount();
 * // Returns 0 if no cart data yet
 */
export function useCartCount() {
  const { data } = useCartSummary();
  return data?.data?.totalItems ?? 0;
}

// ========================
// MUTATION HOOKS
// ========================

/**
 * ✅ Add item to cart
 * - Optimistic update for instant UI feedback
 * - Automatically invalidates cart queries on success
 * - Rolls back on error
 * 
 * @example
 * const addToCart = useAddToCart();
 * 
 * addToCart.mutate({ 
 *   productId: 123, 
 *   quantity: 2 
 * });
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartService.addToCart,
    
    // 🚀 OPTIMISTIC UPDATE: Update UI immediately before server responds
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      
      // Snapshot the previous cart summary
      const previousSummary = queryClient.getQueryData(queryKeys.cart.summary());
      
      // Optimistically update summary (increment total items)
      if (previousSummary) {
        queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
          ...old,
          data: {
            ...old.data,
            totalItems: (old.data?.totalItems ?? 0) + (variables.quantity ?? 1),
          },
        }));
      }
      
      // Return context for rollback
      return { previousSummary };
    },
    
    onSuccess: () => {
      toast.success('Added to cart!');
      // Invalidate to refetch fresh data
      invalidateCartQueries(queryClient);
    },
    
    onError: (error: any, _, context) => {
      // Rollback optimistic update on error
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.cart.summary(), context.previousSummary);
      }
      
      toast.error(error?.response?.data?.message || 'Failed to add to cart');
    },
  });
}

/**
 * ✅ Update cart item quantity
 * - Optimistic update for instant UI
 * - Recalculates subtotal and total automatically
 * 
 * @example
 * const updateItem = useUpdateCartItem();
 * 
 * updateItem.mutate({ 
 *   productId: 123, 
 *   quantity: 5 
 * });
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartService.updateCartItem,
    
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());
      
      // Optimistically update cart
      if (previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          // Update the specific item
          const updatedItems = old.data.items.map((item: CartItem) =>
            item.productId === variables.productId
              ? { 
                  ...item, 
                  quantity: variables.quantity,
                  subtotal: item.price * variables.quantity 
                }
              : item
          );
          
          // Recalculate total
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
      toast.success('Cart updated');
      invalidateCartQueries(queryClient);
    },
    
    onError: (error: any, _, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
      }
      
      toast.error(error?.response?.data?.message || 'Failed to update cart');
    },
  });
}

/**
 * ✅ Remove item from cart
 * - Optimistic removal for instant UI feedback
 * - Recalculates totals automatically
 * 
 * @example
 * const removeItem = useRemoveFromCart();
 * 
 * removeItem.mutate(productId);
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartService.removeFromCart,
    
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());
      
      // Optimistically remove item
      if (previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), (old: any) => {
          // Filter out the removed item
          const filteredItems = old.data.items.filter(
            (item: CartItem) => item.productId !== productId
          );
          
          // Recalculate totals
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
      toast.success('Item removed from cart');
      invalidateCartQueries(queryClient);
    },
    
    onError: (error: any, _, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.details(), context.previousCart);
      }
      
      toast.error(error?.response?.data?.message || 'Failed to remove item');
    },
  });
}

/**
 * ✅ Clear entire cart
 * - Optimistic clear for instant UI
 * - Sets all counts to 0 immediately
 * 
 * @example
 * const clearCart = useClearCart();
 * 
 * clearCart.mutate();
 */
export function useClearCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartService.clearCart,
    
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      
      const previousCart = queryClient.getQueryData(queryKeys.cart.details());
      
      // Optimistically clear cart
      queryClient.setQueryData(queryKeys.cart.details(), (old: any) => ({
        ...old,
        data: {
          ...old.data,
          items: [],
          totalItems: 0,
          totalAmount: 0,
        },
      }));
      
      // Also clear summary
      queryClient.setQueryData(queryKeys.cart.summary(), (old: any) => ({
        ...old,
        data: {
          totalItems: 0,
          totalAmount: 0,
        },
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
      
      toast.error(error?.response?.data?.message || 'Failed to clear cart');
    },
  });
}