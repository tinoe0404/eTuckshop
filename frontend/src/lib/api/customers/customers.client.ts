import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { Customer, CustomerStats } from './customers.types';

export class CustomersService extends BaseAPIRequests {
    /**
     * Get all customers
     */
    async getAll(): Promise<APIResponse<Customer[]>> {
        return this.get<Customer[]>('/customers');
    }

    /**
     * Get customer by ID
     */
    async getById(id: number): Promise<APIResponse<Customer>> {
        return this.get<Customer>(`/customers/${id}`);
    }

    /**
     * Get customer statistics
     */
    async getStats(): Promise<APIResponse<CustomerStats>> {
        return this.get<CustomerStats>('/customers/stats');
    }

    /**
     * Delete customer
     */
    async delete(id: number): Promise<APIResponse<void>> {
        return this.deleteKey<void>(`/customers/${id}`);
    }
}

export const customersService = new CustomersService(apiClient, apiHeaderService);
