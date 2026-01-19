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
            const firstError = error.errors[0];
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
