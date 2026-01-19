import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { DashboardStats, SalesData, AnalyticsDateRange } from './analytics.types';

export class AnalyticsService extends BaseAPIRequests {
    async getDashboardStats(): Promise<APIResponse<DashboardStats>> {
        return this.get<DashboardStats>('/analytics/dashboard');
    }

    async getSalesData(params?: AnalyticsDateRange): Promise<APIResponse<SalesData[]>> {
        return this.get<SalesData[]>('/analytics/sales', params);
    }
}

export const analyticsService = new AnalyticsService(apiClient, apiHeaderService);
