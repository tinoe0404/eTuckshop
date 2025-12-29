// ============================================
// FILE: src/lib/api/services/order.service.ts
// ============================================
import apiClient from '@/lib/api/client';
import { getSession } from 'next-auth/react';
import { ApiResponse, Order } from '@/types';

// ✅ Helper to get userId (Centralized)
// Note: Ideally, your backend should extract this from the session token automatically.
const getUserId = async (): Promise<string> => {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('User not authenticated');
  return session.user.id;
};

export const orderService = {
  // ========================
  // CUSTOMER ACTIONS
  // ========================

  /**
   * Get logged-in user's orders
   */
  getUserOrders: async () => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order[]>>(`/orders`, {
      params: { userId }, // Safer to pass as param than query string manually
    });
    return response.data;
  },

  /**
   * Place an order
   */
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

  /**
   * Get specific order details
   */
  getOrderById: async (id: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`, {
      params: { userId }
    });
    return response.data;
  },

  /**
   * Cancel an order (Customer)
   */
  cancelOrder: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/orders/cancel/${orderId}`,
      { userId }
    );
    return response.data;
  },

  /**
   * Initiate PayNow payment
   */
  initiatePayNow: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<{
      orderId: number;
      paymentUrl: string;
      paymentRef: string;
      amount: number;
      currency: string;
      instructions: string;
    }>>(`/orders/pay/paynow/${orderId}`, {
      params: { userId }
    });
    return response.data;
  },

  /**
   * Get or Check QR Code Status
   */
  getOrderQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<{
      orderId: number;
      qrCode: string;
      expiresAt: string | null;
      isUsed: boolean;
      paymentStatus: string;
      orderSummary: { totalItems: number; totalAmount: number };
    }>>(`/orders/qr/${orderId}`, {
      params: { userId }
    });
    return response.data;
  },

  /**
   * Generate Cash QR (explicit action)
   */
  generateCashQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{
      qrCode: string;
      expiresAt: string;
      expiresIn: string;
    }>>(`/orders/generate-qr/${orderId}`, { userId });
    return response.data;
  },

  // ========================
  // ADMIN ACTIONS
  // ========================

  getAllOrders: async (params?: {
    status?: string;
    paymentType?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<{
      orders: Order[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
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

  completeOrder: async (orderId: number) => {
    const response = await apiClient.patch<ApiResponse<{
      orderId: number;
      status: string;
      completedAt: string;
    }>>(`/orders/admin/complete/${orderId}`);
    return response.data;
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