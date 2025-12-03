import apiClient from '@/lib/api/client';
import { ApiResponse } from '@/types';

export interface AnalyticsSummary {
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  revenueGrowth: number;
}

export interface DailyStat {
  date: string;
  sales: number;
  revenue: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  category: string;
  totalSold: number;
  orderCount: number;
  image: string | null;
}

export interface RecentOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyStats: DailyStat[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  dateRange: {
    start: string;
    end: string;
  };
}

export const analyticsService = {
  getAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<ApiResponse<AnalyticsData>>(
      '/analytics',
      { params }
    );
    return response.data;
  },
};