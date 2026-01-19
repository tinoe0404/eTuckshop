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
} from './orders.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

/**
 * Server Action: Get User Orders
 * Fetches all orders for the authenticated user
 * 
 * @returns APIResponse with orders array or error
 */
export async function getUserOrdersAction(): Promise<APIResponse<Order[] | null>> {
    try {
        const response = await ordersService.getUserOrders();
        return response;
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
 * Fetches a single order by ID
 * 
 * @param id - Order ID
 * @returns APIResponse with order or error
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
 * Fetches order statistics
 * 
 * @returns APIResponse with stats or error
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
 * Creates an order from the user's cart
 * 
 * @param payload - Checkout payload
 * @returns APIResponse with checkout response or error
 */
export async function checkoutAction(
    payload: CheckoutPayload
): Promise<APIResponse<CheckoutResponse | null>> {
    try {
        // Validate with Zod (even if implicit in type, good for runtime safety)
        const validated = createOrderSchema.parse(payload);

        // Call service
        const response = await ordersService.checkout(validated);

        // Revalidate relevant pages
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
 * Fetches all orders with optional filtering
 * 
 * @param params - Filter parameters
 * @returns APIResponse with orders list and pagination
 */
export async function getAdminOrdersAction(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentType?: string;
    search?: string;
}): Promise<APIResponse<{ orders: Order[]; pagination: any } | null>> {
    try {
        const response = await ordersService.getAll(params); // Assuming getAll exists on service
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
 * Updates the status of an order
 * 
 * @param id - Order ID
 * @param payload - Status payload
 * @returns APIResponse with updated order or error
 */
export async function updateOrderStatusAction(
    id: number,
    payload: UpdateOrderStatusPayload
): Promise<APIResponse<Order | null>> {
    try {
        orderIdSchema.parse(id);
        const validated = updateOrderStatusSchema.parse(payload);

        const response = await ordersService.updateStatus(id, validated);

        // Revalidate orders pages
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
 * Cancels an order
 * 
 * @param id - Order ID
 * @returns APIResponse with updated order or error
 */
export async function cancelOrderAction(id: number): Promise<APIResponse<Order | null>> {
    try {
        orderIdSchema.parse(id);

        const response = await ordersService.cancel(id);

        // Revalidate orders pages
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
