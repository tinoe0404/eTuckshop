
// import apiClient from '@/lib/api/client';
import apiClient from '@/lib/api/client';
import { ApiResponse, Cart } from '@/types';

export const cartService = {
  // Get cart
  getCart: async () => {
    const response = await apiClient.get<ApiResponse<Cart>>('/cart');
    return response.data;
  },

  // Add to cart
  addToCart: async (data: { productId: number; quantity?: number }) => {
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/add', data);
    return response.data;
  },

  // Update cart item
  updateCartItem: async (data: { productId: number; quantity: number }) => {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      '/cart/update',
      data
    );
    return response.data;
  },

  // Remove from cart
  removeFromCart: async (productId: number) => {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/remove/${productId}`
    );
    return response.data;
  },

  // Clear cart
  clearCart: async () => {
    const response = await apiClient.delete<ApiResponse<Cart>>('/cart/clear');
    return response.data;
  },

  // Get cart summary
getCartSummary: async () => {
  const response = await apiClient.get<
    ApiResponse<{
      totalItems: number;
      totalAmount: number;
    }>
  >('/cart/summary');
  return response.data;
},

};