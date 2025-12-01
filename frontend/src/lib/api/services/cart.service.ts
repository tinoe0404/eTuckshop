import { ApiResponse, Cart } from "@/types";
import apiClient from '@/lib/api/client';

export const cartService = {
  // Get cart
  getCart: async () => {
    const response = await apiClient.get<ApiResponse<Cart>>("/cart");
    return response.data.data; // <-- return actual cart object
  },

  // Add to cart
  addToCart: async (data: { productId: number; quantity?: number }) => {
    const response = await apiClient.post<ApiResponse<Cart>>("/cart/add", data);
    return response.data.data;
  },

  // Update cart item
  updateCartItem: async (data: { productId: number; quantity: number }) => {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      "/cart/update",
      data
    );
    return response.data.data;
  },

  // Remove from cart
  removeFromCart: async (productId: number) => {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/remove/${productId}`
    );
    return response.data.data;
  },

  // Clear cart
  clearCart: async () => {
    const response = await apiClient.delete<ApiResponse<Cart>>("/cart/clear");
    return response.data.data;
  },

  // Get cart summary
  getCartSummary: async () => {
    const response = await apiClient.get<
      ApiResponse<{
        totalItems: number;
        totalAmount: number;
        itemCount: number;
      }>
    >("/cart/summary");

    return response.data.data;
  },
};
