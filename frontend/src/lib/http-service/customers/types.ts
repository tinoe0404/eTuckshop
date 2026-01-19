import { z } from 'zod';
import { customerListSchema } from './schema';

export type CustomerId = number & { readonly __brand: 'CustomerId' };

export type CustomerListPayload = z.infer<typeof customerListSchema>;

export type Customer = {
    readonly id: CustomerId;
    readonly name: string;
    readonly email: string;
    readonly role: 'ADMIN' | 'CUSTOMER';
    readonly image: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly orderCount?: number;
    readonly totalSpent?: number;
};

export type CustomerResponse = Customer;
export type CustomerListResponse = readonly Customer[];
