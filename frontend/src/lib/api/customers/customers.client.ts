import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { Customer } from './customers.types';

export class CustomersService extends BaseAPIRequests {
    async getAll(): Promise<APIResponse<Customer[]>> {
        return this.get<Customer[]>('/customers');
    }

    async getById(id: number): Promise<APIResponse<Customer>> {
        return this.get<Customer>(`/customers/${id}`);
    }
}

export const customersService = new CustomersService(apiClient, apiHeaderService);
