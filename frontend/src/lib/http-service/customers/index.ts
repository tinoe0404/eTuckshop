import { apiClient } from '../apiClient';
import { customerListSchema, customerIdSchema } from './schema';
import type { CustomerListPayload, CustomerResponse, CustomerListResponse } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

export async function getAllCustomers(params?: Partial<CustomerListPayload>): Promise<CustomerListResponse> {
    try {
        const validated = params ? customerListSchema.parse(params) : {};

        const response = await apiClient.get<ApiResponse<CustomerListResponse>>(
            '/customers',
            { params: validated, signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch customers');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid parameters');
        }

        console.error('Get all customers error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch customers');
    }
}

export async function getCustomerById(id: number): Promise<CustomerResponse> {
    try {
        const validatedId = customerIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<CustomerResponse>>(
            `/customers/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Customer not found');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid customer ID');
        }

        console.error('Get customer by ID error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch customer');
    }
}

// ... imports ...


export async function getCustomerStats(): Promise<import('./types').CustomerStats> {
    try {
        const response = await apiClient.get<ApiResponse<import('./types').CustomerStats>>(
            '/customers/stats',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch customer stats');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get customer stats error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch customer stats');
    }
}

export async function deleteCustomer(id: number): Promise<{ message: string }> {
    try {
        const validatedId = customerIdSchema.parse(id);

        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            `/customers/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete customer');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid customer ID');
        }

        console.error('Delete customer error:', error);
        throw error instanceof Error ? error : new Error('Failed to delete customer');
    }
}
