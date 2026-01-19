'use server';

import { revalidatePath } from 'next/cache';
import { ordersService } from './orders.client';
import { createOrderSchema, updateOrderStatusSchema, orderIdSchema } from './orders.schemas';
import type {
    Order,
    CheckoutPayload,
    CheckoutResponse,
    UpdateOrderStatusPayload,
    OrderStats,
    OrderListResponse,
    ScanQRResponse,
} from './orders.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

/**
 * Server Action: Get User Orders
 */
export async function getUserOrdersAction(): Promise<APIResponse<OrderListResponse | null>> {
    try {
        const response = await ordersService.getUserOrders();

        if (response.success && response.data) {
            const orders = Array.isArray(response.data) ? response.data : [];
            return {
                ...response,
                data: {
                    orders,
                    pagination: { page: 1, limit: orders.length, total: orders.length, totalPages: 1 }
                }
            };
        }

        return { ...response, data: null };
    } catch (error) {
        console.error('[getUserOrdersAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch orders',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Get Order By ID
 */
export async function getOrderByIdAction(id: number): Promise<APIResponse<Order | null>> {
    try {
        orderIdSchema.parse(id);
        const response = await ordersService.getById(id);
        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Invalid order ID',
                data: null,
                error: 'Invalid order ID',
            };
        }

        console.error('[getOrderByIdAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch order',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Get Order Stats (Admin)
 */
export async function getOrderStatsAction(): Promise<APIResponse<OrderStats | null>> {
    try {
        const response = await ordersService.getStats();
        return response;
    } catch (error) {
        console.error('[getOrderStatsAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch order stats',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Checkout
 */
export async function checkoutAction(
    payload: CheckoutPayload
): Promise<APIResponse<CheckoutResponse | null>> {
    try {
        const validated = createOrderSchema.parse(payload);
        const response = await ordersService.checkout(validated);

        revalidatePath('/orders');
        revalidatePath('/cart');
        revalidatePath('/dashboard');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid payment type',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[checkoutAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to checkout',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Get All Orders (Admin)
 */
export async function getAdminOrdersAction(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentType?: string;
    search?: string;
}): Promise<APIResponse<{ orders: Order[]; pagination: any } | null>> {
    try {
        const response = await ordersService.getAll(params);
        return response;
    } catch (error) {
        console.error('[getAdminOrdersAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch admin orders',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Update Order Status (Admin)
 */
export async function updateOrderStatusAction(
    id: number,
    payload: UpdateOrderStatusPayload
): Promise<APIResponse<Order | null>> {
    try {
        orderIdSchema.parse(id);
        const validated = updateOrderStatusSchema.parse(payload);
        const response = await ordersService.updateStatus(id, validated);

        revalidatePath('/orders');
        revalidatePath(`/orders/${id}`);
        revalidatePath('/admin/orders');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid order status',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[updateOrderStatusAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update order status',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Cancel Order
 */
export async function cancelOrderAction(id: number): Promise<APIResponse<Order | null>> {
    try {
        orderIdSchema.parse(id);
        const response = await ordersService.cancel(id);

        revalidatePath('/orders');
        revalidatePath(`/orders/${id}`);

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Invalid order ID',
                data: null,
                error: 'Invalid order ID',
            };
        }

        console.error('[cancelOrderAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to cancel order',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Scan QR Code
 */
export async function scanQRCodeAction(qrData: string): Promise<APIResponse<ScanQRResponse | null>> {
    try {
        return await ordersService.scanQR({ qrData });
    } catch (error) {
        console.error('[scanQRCodeAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Scan failed',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Complete Pickup
 */
export async function completePickupAction(payload: { orderId: number; idempotencyKey: string }): Promise<APIResponse<void>> {
    try {
        const response = await ordersService.completePickup(payload);
        revalidatePath('/orders');
        revalidatePath('/admin/orders');
        return response;
    } catch (error) {
        console.error('[completePickupAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Pickup completion failed',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
