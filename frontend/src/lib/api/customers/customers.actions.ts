'use server';

import { customersService } from './customers.client';
import { customerIdSchema } from './customers.schemas';
import type { Customer } from './customers.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

export async function getCustomersAction(): Promise<APIResponse<Customer[] | null>> {
    try {
        return await customersService.getAll();
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
