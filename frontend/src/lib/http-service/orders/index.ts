import { apiClient } from '../apiClient';
import { createOrderSchema, updateOrderStatusSchema, orderIdSchema } from './schema';
import type { CreateOrderPayload, UpdateOrderStatusPayload, OrderResponse, OrderListResponse } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

/**
 * Get all orders for current user
 */
export async function getUserOrders(): Promise<OrderListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<OrderListResponse>>(
            '/orders',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch orders');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get user orders error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch orders');
    }
}

/**
 * Get order by ID
 */
export async function getOrderById(id: number): Promise<OrderResponse> {
    try {
        const validatedId = orderIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<OrderResponse>>(
            `/orders/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Order not found');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid order ID');
        }

        console.error('Get order by ID error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch order');
    }
}

/**
 * Create new order from cart
 */
export async function createOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
    try {
        const validated = createOrderSchema.parse(payload);

        const response = await apiClient.post<ApiResponse<OrderResponse>>(
            '/orders',
            validated,
            { signal: AbortSignal.timeout(15000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to create order');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid order data');
        }

        console.error('Create order error:', error);
        throw error instanceof Error ? error : new Error('Failed to create order');
    }
}

/**
 * Update order status (Admin only)
 */
export async function updateOrderStatus(
    id: number,
    payload: UpdateOrderStatusPayload
): Promise<OrderResponse> {
    try {
        const validatedId = orderIdSchema.parse(id);
        const validated = updateOrderStatusSchema.parse(payload);

        const response = await apiClient.patch<ApiResponse<OrderResponse>>(
            `/orders/${validatedId}/status`,
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update order');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid data');
        }

        console.error('Update order status error:', error);
        throw error instanceof Error ? error : new Error('Failed to update order');
    }
}

/**
 * Get all orders (Admin only)
 */
export async function getAllOrders(): Promise<OrderListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<OrderListResponse>>(
            '/orders/all',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch orders');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get all orders error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch orders');
    }
}

/**
 * Get QR code for order payment
 */
export async function getOrderQR(id: number): Promise<{ qrCode: string }> {
    try {
        const validatedId = orderIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<{ qrCode: string }>>(
            `/orders/${validatedId}/qr`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get QR code');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get order QR error:', error);
        throw error instanceof Error ? error : new Error('Failed to get QR code');
    }
}
