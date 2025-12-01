import apiClient from '@/lib/api/client';
import { ApiResponse, Order, QRPayload } from '@/lib/types';

export const orderService = {
  // Checkout - create order from cart
  checkout: async (data: { paymentType: 'CASH' | 'PAYNOW' }) => {
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
    >('/orders/checkout', data);
    return response.data;
  },

  // Generate QR for cash payment
  generateCashQR: async (orderId: number) => {
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
    >(`/orders/generate-qr/${orderId}`);
    return response.data;
  },

  // Initiate PayNow payment
  initiatePayNow: async (orderId: number) => {
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
    >(`/orders/pay/paynow/${orderId}`);
    return response.data;
  },

  // Get order QR code
  getOrderQR: async (orderId: number) => {
    const response = await apiClient.get<ApiResponse<QRPayload & { qrCode: string }>>(
      `/orders/qr/${orderId}`
    );
    return response.data;
  },

  // Get user orders
  getUserOrders: async () => {
    const response = await apiClient.get<ApiResponse<Order[]>>('/orders');
    return response.data;
  },

  // Get order by ID
  getOrderById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId: number) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/orders/cancel/${orderId}`
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
};