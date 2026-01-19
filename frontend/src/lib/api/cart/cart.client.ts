import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type {
    AddToCartPayload,
    UpdateCartItemPayload,
    Cart,
    CartSummary,
    CartItem,
    CartItemId,
} from './cart.types';

/**
 * Cart Service Class
 * Handles all cart-related HTTP requests
 */
export class CartService extends BaseAPIRequests {
    /**
     * Get user's cart with all items
     * 
     * @returns Cart with items wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.getCart();
     * console.log(response.data.items);
     * ```
     */
    async getCart(): Promise<APIResponse<Cart>> {
        return this.get<Cart>('/cart');
    }

    /**
     * Get cart summary (total items and amount)
     * 
     * @returns Cart summary wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.getSummary();
     * console.log(`Items: ${response.data.totalItems}, Total: $${response.data.totalAmount}`);
     * ```
     */
    async getSummary(): Promise<APIResponse<CartSummary>> {
        return this.get<CartSummary>('/cart/summary');
    }

    /**
     * Add product to cart
     * 
     * @param payload - Product ID and quantity
     * @returns Updated cart wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.addItem({ productId: 123, quantity: 2 });
     * ```
     */
    async addItem(payload: AddToCartPayload): Promise<APIResponse<Cart>> {
        return this.post<Cart>('/cart/add', payload);
    }

    /**
     * Update cart item quantity
     * 
     * @param payload - Product ID and new quantity
     * @returns Updated cart wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.updateItem({ productId: 123, quantity: 5 });
     * ```
     */
    async updateItem(payload: UpdateCartItemPayload): Promise<APIResponse<Cart>> {
        return this.patch<Cart>('/cart/update', payload);
    }

    /**
     * Remove item from cart
     * 
     * @param productId - Product ID to remove
     * @returns Updated cart wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.removeItem(123);
     * ```
     */
    async removeItem(productId: number): Promise<APIResponse<Cart>> {
        return this.delete<Cart>(`/cart/remove/${productId}`);
    }

    /**
     * Clear entire cart
     * 
     * @returns Empty cart wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await cartService.clear();
     * ```
     */
    async clear(): Promise<APIResponse<Cart>> {
        return this.delete<Cart>('/cart/clear');
    }
}

// Export singleton instance
export const cartService = new CartService(apiClient, apiHeaderService);
