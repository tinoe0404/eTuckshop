import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { Cart, CartSummary, AddToCartRequest, UpdateCartRequest } from "@/types/cart.types";
import type { ApiResponse } from "@/types/api.types";

class CartService {
  async getCart(): Promise<ApiResponse<Cart>> {
    const response = await apiClient.get<ApiResponse<Cart>>(
      API_ENDPOINTS.CART.BASE
    );
    return response.data;
  }

  async getCartSummary(): Promise<ApiResponse<CartSummary>> {
    const response = await apiClient.get<ApiResponse<CartSummary>>(
      API_ENDPOINTS.CART.SUMMARY
    );
    return response.data;
  }

  async addToCart(data: AddToCartRequest): Promise<ApiResponse<Cart>> {
    const response = await apiClient.post<ApiResponse<Cart>>(
      API_ENDPOINTS.CART.ADD,
      data
    );
    return response.data;
  }

  async updateCartItem(data: UpdateCartRequest): Promise<ApiResponse<Cart>> {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      API_ENDPOINTS.CART.UPDATE,
      data
    );
    return response.data;
  }

  async removeFromCart(productId: number): Promise<ApiResponse<Cart>> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      API_ENDPOINTS.CART.REMOVE(productId)
    );
    return response.data;
  }

  async clearCart(): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(
      API_ENDPOINTS.CART.CLEAR
    );
    return response.data;
  }
}

export const cartService = new CartService();