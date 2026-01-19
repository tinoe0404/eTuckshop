import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type {
    Order,
    OrderListResponse,
    OrderStats,
    CheckoutPayload,
    CheckoutResponse,
    OrderQRResponse,
    UpdateOrderStatusPayload,
} from './orders.types';

/**
 * Orders Service Class
 * Handles all order-related HTTP requests
 */
export class OrdersService extends BaseAPIRequests {
    /**
     * Get user's orders
     * 
     * @returns List of orders wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async getUserOrders(): Promise<APIResponse<Order[]>> {
        return this.get<Order[]>('/orders');
    }

    /**
     * Get single order by ID
     * 
     * @param id - Order ID
     * @returns Order details wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async getById(id: number): Promise<APIResponse<Order>> {
        return this.get<Order>(`/orders/${id}`);
    }

    /**
     * Get all orders (Admin only)
     * 
     * @param params - Optional pagination/filter params
     * @returns Paginated orders wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async getAll(params?: any): Promise<APIResponse<OrderListResponse>> {
        return this.get<OrderListResponse>('/orders/all', params);
    }

    /**
     * Get order statistics (Admin only)
     * 
     * @returns Order stats wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async getStats(): Promise<APIResponse<OrderStats>> {
        return this.get<OrderStats>('/orders/stats');
    }

    /**
     * Checkout - Create order from cart
     * 
     * @param payload - Payment type (CASH or PAYNOW)
     * @returns Checkout response with order details wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async checkout(payload: CheckoutPayload): Promise<APIResponse<CheckoutResponse>> {
        return this.post<CheckoutResponse>('/orders/checkout', payload);
    }

    /**
     * Get order QR code for payment
     * 
     * @param orderId - Order ID
     * @returns QR code data wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async getOrderQR(orderId: number): Promise<APIResponse<OrderQRResponse>> {
        return this.get<OrderQRResponse>(`/orders/${orderId}/qr`);
    }

    /**
     * Update order status (Admin only)
     * 
     * @param id - Order ID
     * @param payload - New status
     * @returns Updated order wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async updateStatus(id: number, payload: UpdateOrderStatusPayload): Promise<APIResponse<Order>> {
        return this.patch<Order>(`/orders/${id}/status`, payload);
    }

    /**
     * Cancel order
     * 
     * @param id - Order ID
     * @returns Updated order wrapped in APIResponse
     * @throws {APIError} If request fails
     */
    async cancel(id: number): Promise<APIResponse<Order>> {
        return this.patch<Order>(`/orders/${id}/cancel`, {});
    }
}

// Export singleton instance
export const ordersService = new OrdersService(apiClient, apiHeaderService);
