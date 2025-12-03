import apiClient from '@/lib/api/client';
import { ApiResponse } from '@/types';

// ========================
// Types
// ========================
export interface CustomerStatistics {
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItems?: any[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;

  // Added fields
  statistics: CustomerStatistics;
  recentOrders: Order[];

  // Optional for table listing
  totalOrders?: number;
  completedOrders?: number;
  totalSpent?: number;
  lastOrder?: {
    orderNumber: string;
    amount: number;
    date: string;
  } | null;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  inactiveCustomers: number;
  topCustomers: Array<{
    userId: number;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

// ========================
// Service
// ========================
export const customerService = {
  // Get all customers
  getAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    const response = await apiClient.get<
      ApiResponse<{
        customers: Customer[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>
    >('/customers', { params });
    return response.data;
  },

  // Get customer by ID
  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data;
  },

  // Get customer statistics
  getStats: async () => {
    const response = await apiClient.get<ApiResponse<CustomerStats>>('/customers/stats');
    return response.data;
  },

  // Delete customer
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<{ id: number }>>(`/customers/${id}`);
    return response.data;
  },
};
