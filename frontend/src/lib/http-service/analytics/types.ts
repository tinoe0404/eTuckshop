import { z } from 'zod';
import { analyticsDateRangeSchema } from './schema';

export type AnalyticsDateRangePayload = z.infer<typeof analyticsDateRangeSchema>;

export type AnalyticsSummary = {
    readonly totalUsers: number;
    readonly totalProducts: number;
    readonly totalSales: number;
    readonly totalRevenue: number;
    readonly averageOrderValue: number;
    readonly totalOrders: number;
    readonly revenueGrowth: number;
};

export type DailyStats = {
    readonly date: string;
    readonly sales: number;
    readonly revenue: number;
};

export type TopProduct = {
    readonly productId: number;
    readonly name: string;
    readonly category: string;
    readonly image: string | null;
    readonly totalSold: number;
    readonly orderCount: number;
};

export type AnalyticsData = {
    readonly summary: AnalyticsSummary;
    readonly dailyStats: readonly DailyStats[];
    readonly topProducts: readonly TopProduct[];
    readonly dateRange: {
        readonly start: string;
        readonly end: string;
    };
};
