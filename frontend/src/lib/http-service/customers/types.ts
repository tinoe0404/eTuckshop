import { z } from 'zod';
import { customerListSchema } from './schema';

export type CustomerId = number & { readonly __brand: 'CustomerId' };

export type CustomerListPayload = z.infer<typeof customerListSchema>;


export type CustomerStatistics = {
    readonly totalOrders: number;
    readonly completedOrders: number;
    readonly totalSpent: number;
    readonly averageOrderValue: number;
    readonly pendingOrders: number;
    readonly paidOrders: number;
    readonly cancelledOrders: number;
};

// Simplified Order for Customer details
export type CustomerOrder = {
    readonly id: number;
    readonly orderNumber: string;
    readonly totalAmount: number;
    readonly status: string;
    readonly createdAt: string;
    readonly orderItems?: readonly any[];
};

export type Customer = {
    readonly id: CustomerId;
    readonly name: string;
    readonly email: string;
    readonly role: 'ADMIN' | 'CUSTOMER';
    readonly image: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;

    // Extended fields (legacy compatibility)
    readonly statistics: CustomerStatistics;
    readonly recentOrders: readonly CustomerOrder[];

    // Optional for table listing
    readonly totalOrders?: number;
    readonly completedOrders?: number;
    readonly totalSpent?: number;
    readonly lastOrder?: {
        readonly orderNumber: string;
        readonly amount: number;
        readonly date: string;
    } | null;
};

export type CustomerStats = {
    readonly totalCustomers: number;
    readonly activeCustomers: number;
    readonly newCustomersThisMonth: number;
    readonly inactiveCustomers: number;
    readonly topCustomers: ReadonlyArray<{
        readonly userId: number;
        readonly name: string;
        readonly email: string;
        readonly totalSpent: number;
        readonly orderCount: number;
    }>;
};

export type CustomerResponse = Customer;

export type CustomerListResponse = {
    readonly customers: readonly Customer[];
    readonly pagination: {
        readonly total: number;
        readonly page: number;
        readonly limit: number;
        readonly totalPages: number;
    };
};
