import type { User } from '../auth/auth.types';
import type { Order } from '../orders/orders.types';

export type CustomerStats = {
    readonly totalCustomers: number;
    readonly activeCustomers: number;
    readonly newCustomersThisMonth: number;
    readonly inactiveCustomers: number;
};

export type Customer = User & {
    readonly totalOrders?: number;
    readonly completedOrders?: number;
    readonly totalSpent?: number;
    readonly lastOrder?: {
        readonly orderNumber: string;
        readonly date: string;
    } | null;

    // Detailed stats for single view
    readonly statistics?: {
        readonly totalOrders: number;
        readonly completedOrders: number;
        readonly totalSpent: number;
        readonly averageOrderValue: number;
    };
    readonly recentOrders?: readonly Order[];
};

export type CustomerListResponse = {
    readonly customers: readonly Customer[];
    readonly pagination: {
        readonly page: number;
        readonly limit: number;
        readonly total: number;
        readonly totalPages: number;
    };
};
