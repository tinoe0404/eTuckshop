import { apiClient } from '../apiClient';
import {
    createOrderSchema,
    updateOrderStatusSchema,
    orderIdSchema,
    checkoutPayloadSchema,
    rejectOrderSchema,
    scanQRCodeSchema
} from './schema';
import type {
    CreateOrderPayload,
    UpdateOrderStatusPayload,
    OrderResponse,
    OrderListResponse,
    CheckoutPayload,
    CheckoutResponse,
    OrderStats,
    PayNowResponse,
    OrderQRResponse,
    CashQRResponse,
    ScanQRResponse
} from './types';
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
            const firstError = error.issues[0];
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
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid data');
        }

        console.error('Update order status error:', error);
        throw error instanceof Error ? error : new Error('Failed to update order');
    }
}

/**
 * Get all orders (Admin only)
 */
export async function getAllOrders(params: { status?: string; paymentType?: string; page?: number; limit?: number } = {}): Promise<OrderListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<OrderListResponse>>(
            '/orders/all',
            {
                params,
                signal: AbortSignal.timeout(10000)
            }
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
export async function getOrderQR(id: number): Promise<OrderQRResponse> {
    try {
        const validatedId = orderIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<OrderQRResponse>>(
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

/**
 * Checkout (create order with payment intent)
 */
export async function checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    try {
        const validated = checkoutPayloadSchema.parse(payload);
        const response = await apiClient.post<ApiResponse<CheckoutResponse>>(
            '/orders/checkout',
            validated,
            { signal: AbortSignal.timeout(20000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Checkout failed');
        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) throw new Error(error.issues[0]?.message || 'Invalid checkout data');
        console.error('Checkout error:', error);
        throw error instanceof Error ? error : new Error('Checkout failed');
    }
}

/**
 * Cancel Order
 */
export async function cancelOrder(orderId: number): Promise<{ message: string }> {
    try {
        const validatedId = orderIdSchema.parse(orderId);
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            `/orders/cancel/${validatedId}`,
            {},
            { signal: AbortSignal.timeout(10000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Failed to cancel order');
        return response.data.data;
    } catch (error) {
        console.error('Cancel order error:', error);
        throw error instanceof Error ? error : new Error('Failed to cancel order');
    }
}

/**
 * Initiate PayNow
 */
export async function initiatePayNow(orderId: number): Promise<PayNowResponse> {
    try {
        const validatedId = orderIdSchema.parse(orderId);
        const response = await apiClient.get<ApiResponse<PayNowResponse>>(
            `/orders/pay/paynow/${validatedId}`,
            { signal: AbortSignal.timeout(15000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Failed to initiate PayNow');
        return response.data.data;
    } catch (error) {
        console.error('PayNow initiation error:', error);
        throw error instanceof Error ? error : new Error('Failed to initiate PayNow');
    }
}

/**
 * Generate Cash Payment QR
 */
export async function generateCashQR(orderId: number): Promise<CashQRResponse> {
    try {
        const validatedId = orderIdSchema.parse(orderId);
        const response = await apiClient.post<ApiResponse<CashQRResponse>>(
            `/orders/generate-qr/${validatedId}`,
            {},
            { signal: AbortSignal.timeout(10000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Failed to generate QR');
        return response.data.data;
    } catch (error) {
        console.error('Generate Cash QR error:', error);
        throw error instanceof Error ? error : new Error('Failed to generate QR');
    }
}

/**
 * Scan QR Code (Admin)
 */
export async function scanQRCode(qrData: string): Promise<ScanQRResponse> {
    try {
        const validated = scanQRCodeSchema.parse({ qrData });
        const response = await apiClient.post<ApiResponse<ScanQRResponse>>(
            '/orders/admin/scan-qr',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Invalid QR code');
        return response.data.data;
    } catch (error) {
        console.error('Scan QR error:', error);
        throw error instanceof Error ? error : new Error('Failed to scan QR');
    }
}

/**
 * Complete Order (Admin) with Idempotency
 */
export async function completeOrder(payload: { orderId: number; idempotencyKey?: string }): Promise<{ orderId: number; status: string; completedAt: string }> {
    const { orderId, idempotencyKey } = payload;
    const validatedId = orderIdSchema.parse(orderId);
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await apiClient.patch<ApiResponse<{ orderId: number; status: string; completedAt: string }>>(
                `/orders/admin/complete/${validatedId}`,
                { timestamp: Date.now() },
                { headers, signal: AbortSignal.timeout(10000) }
            );

            if (!response.data.success) throw new Error(response.data.message || 'Failed to complete order');
            return response.data.data;
        } catch (error: any) {
            attempt++;
            const isNetworkError = error.message === 'Network Error' || !error.response;
            if (isNetworkError && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            throw error instanceof Error ? error : new Error('Failed to complete order');
        }
    }
    throw new Error('Failed to complete order after retries');
}

/**
 * Reject Order (Admin)
 */
export async function rejectOrder(payload: { orderId: number; reason?: string }): Promise<{ orderId: number; status: string; reason: string }> {
    try {
        const { orderId, reason } = payload;
        const validatedId = orderIdSchema.parse(orderId);
        const validatedPayload = rejectOrderSchema.parse({ reason });

        const response = await apiClient.patch<ApiResponse<{ orderId: number; status: string; reason: string }>>(
            `/orders/admin/reject/${validatedId}`,
            validatedPayload,
            { signal: AbortSignal.timeout(10000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Failed to reject order');
        return response.data.data;
    } catch (error) {
        console.error('Reject order error:', error);
        throw error instanceof Error ? error : new Error('Failed to reject order');
    }
}

/**
 * Get Order Stats (Admin)
 */
export async function getOrderStats(): Promise<OrderStats> {
    try {
        const response = await apiClient.get<ApiResponse<OrderStats>>(
            '/orders/admin/stats',
            { signal: AbortSignal.timeout(10000) }
        );
        if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch stats');
        return response.data.data;
    } catch (error) {
        console.error('Get order stats error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch stats');
    }
}
