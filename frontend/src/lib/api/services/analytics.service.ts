import apiClient from '@/lib/api/client';
import { ApiResponse, DashboardStats, AnalyticsData } from '@/types';

// ========================
// Analytics Service
// ========================
export const analyticsService = {
  /**
   * Get dashboard statistics for main admin dashboard
   * Used in: /admin/dashboard
   */
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStats>>(
        '/analytics/dashboard'
      );
      return response.data;
    } catch (error: any) {
      console.error('Dashboard stats error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get detailed analytics data for analytics page
   * Used in: /admin/analytics
   * @param params - Optional date range filters
   */
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await apiClient.get<ApiResponse<AnalyticsData>>(
        '/analytics',
        { params }
      );
      return response.data;
    } catch (error: any) {
      console.error('Analytics error:', error.response?.data || error.message);
      throw error;
    }
  },
};