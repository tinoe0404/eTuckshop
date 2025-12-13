// File: src/lib/api/services/cart.service.ts (UPDATED FOR NEXTAUTH)

import apiClient from '@/lib/api/client';
import { getSession } from 'next-auth/react';
import { ApiResponse, Cart } from '@/types';

// Helper to get userId from session
const getUserId = async (): Promise<string> => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
};

export const cartService = {
  // Get cart
  getCart: async () => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<Cart>>('/cart', { userId });
    return response.data;
  },

  // Add to cart
  addToCart: async (data: { productId: number; quantity?: number }) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/add', {
      userId,
      ...data,
    });
    return response.data;
  },

  // Update cart item
  updateCartItem: async (data: { productId: number; quantity: number }) => {
    const userId = await getUserId();
    const response = await apiClient.patch<ApiResponse<Cart>>('/cart/update', {
      userId,
      ...data,
    });
    return response.data;
  },

  // Remove from cart
  removeFromCart: async (productId: number) => {
    const userId = await getUserId();
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/remove/${productId}`,
      { data: { userId } }
    );
    return response.data;
  },

  // Clear cart
  clearCart: async () => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/clear', { userId });
    return response.data;
  },

  // Get cart summary
  getCartSummary: async () => {
    const userId = await getUserId();
    const response = await apiClient.post<
      ApiResponse<{
        totalItems: number;
        totalAmount: number;
      }>
    >('/cart/summary', { userId });
    return response.data;
  },
};