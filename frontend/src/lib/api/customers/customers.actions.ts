'use server';

import { customersService } from './customers.client';
import { customerIdSchema } from './customers.schemas';
import type { Customer, CustomerListResponse, CustomerStats } from './customers.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Get all customers with pagination wrapper
 */
export async function getCustomersAction(): Promise<APIResponse<CustomerListResponse | null>> {
    try {
        const response = await customersService.getAll();

        if (response.success && response.data) {
            const customers = Array.isArray(response.data) ? response.data : [];
            return {
                ...response,
                data: {
                    customers,
                    pagination: { page: 1, limit: customers.length, total: customers.length, totalPages: 1 }
                }
            };
        }

        return { ...response, data: null };
    } catch (error) {
        console.error('[getCustomersAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch customers',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get customer by ID
 */
export async function getCustomerByIdAction(id: number): Promise<APIResponse<Customer | null>> {
    try {
        customerIdSchema.parse(id);
        return await customersService.getById(id);
    } catch (error) {
        console.error('[getCustomerByIdAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch customer',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get customer statistics
 */
export async function getCustomerStatsAction(): Promise<APIResponse<CustomerStats | null>> {
    try {
        return await customersService.getStats();
    } catch (error) {
        console.error('[getCustomerStatsAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch customer stats',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Delete customer
 */
export async function deleteCustomerAction(id: number): Promise<APIResponse<void>> {
    try {
        customerIdSchema.parse(id);
        const response = await customersService.deleteCustomer(id);
        revalidatePath('/admin/customers');
        return response;
    } catch (error) {
        console.error('[deleteCustomerAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete customer',
            data: undefined, // void data should be undefined
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
