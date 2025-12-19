// lib/api/services/order.service.ts
import apiClient from '@/lib/api/client';
import { getSession } from 'next-auth/react';
import { ApiResponse, Order } from '@/types';

// Helper to get userId from session
const getUserId = async (): Promise<string> => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
};

export const orderService = {
  // Get user orders - USE GET with query param
  getUserOrders: async () => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order[]>>(`/orders?userId=${userId}`);
    return response.data;
  },

  // Checkout - create order from cart
  checkout: async (data: { paymentType: 'CASH' | 'PAYNOW' }) => {
    const userId = await getUserId();
    const response = await apiClient.post<
      ApiResponse<{
        orderId: number;
        orderNumber: string;
        totalAmount: number;
        paymentType: string;
        status: string;
        orderItems: any[];
        nextStep: {
          action: string;
          url: string;
          note: string;
        };
      }>
    >('/orders/checkout', { userId, ...data });
    return response.data;
  },

  // Generate QR for cash payment
  generateCashQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<
      ApiResponse<{
        orderId: number;
        orderNumber: string;
        paymentType: string;
        paymentStatus: string;
        customer: {
          name: string;
          email: string;
        };
        orderSummary: {
          items: any[];
          totalItems: number;
          totalAmount: number;
        };
        qrCode: string;
        expiresAt: string;
        expiresIn: string;
      }>
    >(`/orders/generate-qr/${orderId}`, { userId });
    return response.data;
  },

  // Initiate PayNow payment - Returns URL for frontend navigation
  initiatePayNow: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<
      ApiResponse<{
        orderId: number;
        orderNumber: string;
        amount: number;
        currency: string;
        paymentRef: string;
        paymentUrl: string;
        instructions: string;
      }>
    >(`/orders/pay/paynow/${orderId}?userId=${userId}`);
    return response.data;
  },

  // Get order by ID
  getOrderById: async (id: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}?userId=${userId}`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/orders/cancel/${orderId}`,
      { userId }
    );
    return response.data;
  },

  // Admin: Get all orders
  getAllOrders: async (params?: {
    status?: string;
    paymentType?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<
      ApiResponse<{
        orders: Order[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>
    >('/orders/admin/all', { params });
    return response.data;
  },

  // Admin: Scan QR code
  scanQRCode: async (qrData: string) => {
    const response = await apiClient.post<
      ApiResponse<{
        paymentMethod: {
          type: string;
          label: string;
          status: string;
        };
        customer: {
          name: string;
          email: string;
        };
        orderSummary: {
          items: any[];
          totalItems: number;
          totalAmount: number;
        };
        orderInfo: {
          orderId: number;
          orderNumber: string;
          status: string;
          createdAt: string;
          paidAt: string | null;
        };
        instructions: string;
        action: {
          complete: string;
        };
      }>
    >('/orders/admin/scan-qr', { qrData });
    return response.data;
  },

  // Admin: Complete order
  completeOrder: async (orderId: number) => {
    const response = await apiClient.patch<
      ApiResponse<{
        orderId: number;
        status: string;
        completedAt: string;
        qrStatus: string;
      }>
    >(`/orders/admin/complete/${orderId}`);
    return response.data;
  },

  // Admin: Reject order
  rejectOrder: async (orderId: number, reason?: string) => {
    const response = await apiClient.patch<
      ApiResponse<{
        orderId: number;
        status: string;
        reason: string;
      }>
    >(`/orders/admin/reject/${orderId}`, { reason });
    return response.data;
  },

  // Admin: Get order stats
  getOrderStats: async () => {
    const response = await apiClient.get<
      ApiResponse<{
        orders: {
          total: number;
          pending: number;
          paid: number;
          completed: number;
          cancelled: number;
        };
        revenue: number;
      }>
    >('/orders/admin/stats');
    return response.data;
  },

  // Get order QR code
  getOrderQR: async (orderId: number) => {
    const userId = await getUserId();
    const response = await apiClient.get<
      ApiResponse<{
        orderId: number;
        orderNumber: string;
        paymentType: string;
        paymentStatus: string;
        customer: {
          name: string;
          email: string;
        };
        orderSummary: {
          items: any[];
          totalItems: number;
          totalAmount: number;
        };
        qrCode: string;
        expiresAt: string | null;
        paidAt: string | null;
        isUsed: boolean;
      }>
    >(`/orders/qr/${orderId}?userId=${userId}`);

    return response.data;
  },
};