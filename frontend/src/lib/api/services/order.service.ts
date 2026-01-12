// Replace src/lib/api/services/order.service.ts with this file
// KEY CHANGE: Added idempotency key support for completeOrder

import apiClient from '@/lib/api/client';
import { getSession } from 'next-auth/react';
import { ApiResponse, Order } from '@/types';

const getUserId = async (): Promise<string> => {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('User not authenticated');
  return session.user.id;
};

export const orderService = {
  getUserOrders: async () => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order[]>>(`/orders`, { params: { userId } });
    return response.data;
  },

  checkout: async (data: { paymentType: 'CASH' | 'PAYNOW' }) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{
      orderId: number;
      orderNumber: string;
      totalAmount: number;
      paymentType: string;
      status: string;
      nextStep: { action: string; url: string; note: string };
    }>>('/orders/checkout', { userId, ...data });
    return response.data;
  },

  getOrderById: async (id: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`, { params: { userId } });
    return response.data;
  },

  cancelOrder: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{ message: string }>>(`/orders/cancel/${orderId}`, { userId });
    return response.data;
  },

  initiatePayNow: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<{
      orderId: number;
      paymentUrl: string;
      paymentRef: string;
      amount: number;
      currency: string;
      instructions: string;
    }>>(`/orders/pay/paynow/${orderId}`, { params: { userId } });
    return response.data;
  },

  getOrderQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<{
      orderId: number;
      qrCode: string;
      expiresAt: string | null;
      isUsed: boolean;
      paymentStatus: string;
      orderSummary: { totalItems: number; totalAmount: number };
    }>>(`/orders/qr/${orderId}`, { params: { userId } });
    return response.data;
  },

  generateCashQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{
      qrCode: string;
      expiresAt: string;
      expiresIn: string;
    }>>(`/orders/generate-qr/${orderId}`, { userId });
    return response.data;
  },

  getAllOrders: async (params?: {
    status?: string;
    paymentType?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>>('/orders/admin/all', { params });
    return response.data;
  },

  scanQRCode: async (qrData: string) => {
    const response = await apiClient.post<ApiResponse<{
      paymentMethod: { type: string; status: string };
      customer: { name: string; email: string };
      orderInfo: { orderId: number; status: string };
      action: { complete: string };
    }>>('/orders/admin/scan-qr', { qrData });
    return response.data;
  },

  // ✅ REFACTORED: Added idempotency key parameter
  completeOrder: async (orderId: number, idempotencyKey?: string) => {
    const headers: any = {};
    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const response = await apiClient.patch<ApiResponse<{
          orderId: number;
          status: string;
          completedAt: string;
        }>>(`/orders/admin/complete/${orderId}`, { timestamp: Date.now() }, { headers }); // Added body payload
        return response.data;
      } catch (error: any) {
        attempt++;
        const isNetworkError = error.message === 'Network Error' || !error.response;

        if (isNetworkError && attempt < MAX_RETRIES) {
          console.warn(`Retry ${attempt}/${MAX_RETRIES} for completeOrder due to network error`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
  },

  rejectOrder: async (orderId: number, reason?: string) => {
    const response = await apiClient.patch<ApiResponse<{
      orderId: number;
      status: string;
      reason: string;
    }>>(`/orders/admin/reject/${orderId}`, { reason });
    return response.data;
  },

  getOrderStats: async () => {
    const response = await apiClient.get<ApiResponse<{
      orders: { total: number; pending: number; paid: number; completed: number; cancelled: number };
      revenue: number;
    }>>('/orders/admin/stats');
    return response.data;
  },
};