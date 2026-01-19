'use server';

import { analyticsService } from './analytics.client';
import type { DashboardStats, SalesData } from './analytics.types';
import type { APIResponse } from '../client/types';

export async function getDashboardStatsAction(): Promise<APIResponse<DashboardStats | null>> {
    try {
        return await analyticsService.getDashboardStats();
    } catch (error) {
        console.error('[getDashboardStatsAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function getSalesDataAction(): Promise<APIResponse<SalesData[] | null>> {
    try {
        return await analyticsService.getSalesData();
    } catch (error) {
        console.error('[getSalesDataAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch sales data',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
