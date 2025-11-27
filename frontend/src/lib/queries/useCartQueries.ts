import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { cartService } from "@/lib/api/services/cart.service";
import type { Cart, CartSummary, AddToCartRequest, UpdateCartRequest } from "@/types/cart.types";
import type { ApiResponse } from "@/types/api.types";
import { useCartStore } from "@/lib/stores/cartStore";

export const cartKeys = {
  all: ["cart"] as const,
  cart: () => [...cartKeys.all, "detail"] as const,
  summary: () => [...cartKeys.all, "summary"] as const,
};

export function useCart(
  options?: Omit<UseQueryOptions<ApiResponse<Cart>>, "queryKey" | "queryFn">
) {
  const { setCart } = useCartStore();
  
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: async () => {
      const response = await cartService.getCart();
      // Sync with store
      if (response.data) {
        setCart(response.data.items, response.data.totalItems, response.data.totalAmount);
      }
      return response;
    },
    ...options,
  });
}

export function useCartSummary(
  options?: Omit<UseQueryOptions<ApiResponse<CartSummary>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: () => cartService.getCartSummary(),
    ...options,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();
  
  return useMutation({
    mutationFn: (data: AddToCartRequest) => addItem(data.productId, data.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { updateItem } = useCartStore();
  
  return useMutation({
    mutationFn: (data: UpdateCartRequest) => updateItem(data.productId, data.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { removeItem } = useCartStore();
  
  return useMutation({
    mutationFn: (productId: number) => removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const { clearCart } = useCartStore();
  
  return useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}