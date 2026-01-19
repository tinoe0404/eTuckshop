import { apiClient } from '../apiClient';
import { analyticsDateRangeSchema } from './schema';
import type { AnalyticsDateRangePayload, AnalyticsData } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

export async function getAnalytics(params?: AnalyticsDateRangePayload): Promise<AnalyticsData> {
    try {
        const validated = params ? analyticsDateRangeSchema.parse(params) : undefined;

        const response = await apiClient.get<ApiResponse<AnalyticsData>>(
            '/analytics',
            { params: validated, signal: AbortSignal.timeout(15000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch analytics');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid date range');
        }

        console.error('Get analytics error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch analytics');
    }
}


export async function getDashboardStats(): Promise<any> { // TODO: Define strict type for dashboard stats
    try {
        const response = await apiClient.get<ApiResponse<any>>(
            '/analytics/dashboard',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch dashboard stats');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch dashboard stats');
    }
}
