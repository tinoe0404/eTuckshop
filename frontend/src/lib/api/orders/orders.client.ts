import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type {
    Order,
    CheckoutPayload,
    CheckoutResponse,
    UpdateOrderStatusPayload,
    OrderStats,
    OrderListResponse,
    ScanQRResponse,
    ScanQRPayload
} from './orders.types';

export class OrdersService extends BaseAPIRequests {
    async getUserOrders(): Promise<APIResponse<OrderListResponse>> {
        return this.get<OrderListResponse>('/orders');
    }

    async getById(id: number): Promise<APIResponse<Order>> {
        return this.get<Order>(`/orders/${id}`);
    }

    async getStats(): Promise<APIResponse<OrderStats>> {
        return this.get<OrderStats>('/orders/admin/stats');
    }

    async checkout(payload: CheckoutPayload): Promise<APIResponse<CheckoutResponse>> {
        return this.post<CheckoutResponse>('/orders/checkout', payload);
    }

    async getAll(params?: {
        page?: number;
        limit?: number;
        status?: string;
        paymentType?: string;
        search?: string;
    }): Promise<APIResponse<{ orders: Order[]; pagination: any }>> {
        return this.get<{ orders: Order[]; pagination: any }>('/orders/admin/all', params);
    }

    // FIXME: Backend does not have a generic status update endpoint.
    // Only /admin/complete and /admin/reject exist.
    // async updateStatus(id: number, payload: UpdateOrderStatusPayload): Promise<APIResponse<Order>> {
    //    return this.patch<Order>(`/orders/${id}/status`, payload);
    // }

    async cancel(id: number): Promise<APIResponse<Order>> {
        return this.post<Order>(`/orders/cancel/${id}`);
    }

    async generateCashQR(orderId: number): Promise<APIResponse<{ qrCode: string; expiresAt: string }>> {
        return this.post(`/orders/generate-qr/${orderId}`);
    }

    async initiatePayNow(orderId: number): Promise<APIResponse<{ paymentUrl: string; paymentRef: string }>> {
        return this.get(`/orders/pay/paynow/${orderId}`);
    }

    async getOrderQR(orderId: number): Promise<APIResponse<{ qrCode: string; expiresAt: string }>> {
        return this.get(`/orders/qr/${orderId}`);
    }

    // Backend: router.post("/admin/scan-qr", requireAuth, requireAdmin, scanQRCode);
    async scanQR(payload: ScanQRPayload): Promise<APIResponse<ScanQRResponse>> {
        return this.post<ScanQRResponse>('/orders/admin/scan-qr', payload);
    }

    // Backend: router.patch("/admin/reject/:orderId", requireAuth, requireAdmin, rejectOrder);
    async rejectOrder(orderId: number): Promise<APIResponse<void>> {
        return this.patch<void>(`/orders/admin/reject/${orderId}`, {});
    }

    // Backend: router.patch("/admin/complete/:orderId", requireAuth, requireAdmin, completeOrder);
    // Header: x-idempotency-key
    async completePickup(payload: { orderId: number; idempotencyKey: string }): Promise<APIResponse<void>> {
        return this.patch<void>(
            `/orders/admin/complete/${payload.orderId}`,
            {}, // Empty body
            { headers: { 'x-idempotency-key': payload.idempotencyKey } }
        );
    }
}

export const ordersService = new OrdersService(apiClient, apiHeaderService);
