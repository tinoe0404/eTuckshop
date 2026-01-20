import { z } from 'zod';
import { analyticsDateRangeSchema } from './analytics.schemas';

export type AnalyticsDateRange = z.infer<typeof analyticsDateRangeSchema>;

export type DashboardStats = {
    totalRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
};

export type SalesData = {
    date: string;
    revenue: number;
    orders: number;
};
