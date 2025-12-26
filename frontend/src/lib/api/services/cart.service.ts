// ============================================
// FILE: src/lib/api/services/cart.service.ts (FIXED)
// ============================================

import apiClient from '@/lib/api/client';
import { ApiResponse, Cart } from '@/types';

/**
 * ✅ FIXED: Removed getSession() calls
 * - Session is handled by apiClient interceptor (X-User-Id header)
 * - No need to pass userId manually
 */

export const cartService = {
  /**
   * ✅ Get full cart details
   * FIXED: Uses GET instead of POST
   */
  getCart: async () => {
    const response = await apiClient.get<ApiResponse<Cart>>('/cart');
    return response.data;
  },

  /**
   * ✅ Get cart summary (lightweight)
   * Returns only { totalItems, totalAmount }
   */
  getCartSummary: async () => {
    const response = await apiClient.get<
      ApiResponse<{
        totalItems: number;
        totalAmount: number;
      }>
    >('/cart/summary');
    return response.data;
  },

  /**
   * ✅ Add item to cart
   */
  addToCart: async (data: { productId: number; quantity?: number }) => {
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/add', data);
    return response.data;
  },

  /**
   * ✅ Update cart item quantity
   */
  updateCartItem: async (data: { productId: number; quantity: number }) => {
    const response = await apiClient.patch<ApiResponse<Cart>>('/cart/update', data);
    return response.data;
  },

  /**
   * ✅ Remove item from cart
   */
  removeFromCart: async (productId: number) => {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/remove/${productId}`
    );
    return response.data;
  },

  /**
   * ✅ Clear entire cart
   */
  clearCart: async () => {
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/clear');
    return response.data;
  },
};