import { AxiosRequestConfig, AxiosError } from 'axios';
import { apiClient } from './apiClient';

/**
 * Generic API response wrapper from backend
 */
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error?: string;
}

/**
 * API Error with structured information
 */
export class APIError extends Error {
    public readonly statusCode?: number;
    public readonly response?: any;

    constructor(message: string, statusCode?: number, response?: any) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.response = response;
    }
}

/**
 * Handle API errors consistently across all requests
 * @param error - The error from axios or other sources
 * @throws {APIError} Structured error with status code and message
 */
export function handleAPIError(error: unknown): never {
    if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.message || error.message;
        const responseData = error.response?.data;

        throw new APIError(message, statusCode, responseData);
    }

    if (error instanceof Error) {
        throw new APIError(error.message);
    }

    throw new APIError('An unknown error occurred');
}

/**
 * Make a type-safe API request with consistent error handling
 * 
 * @template T - The expected data type from the API
 * @param config - Axios request configuration
 * @returns The data from the API response
 * @throws {APIError} If the request fails or validation fails
 * 
 * @example
 * ```typescript
 * const products = await makeRequest<Product[]>({
 *   method: 'GET',
 *   url: '/products'
 * });
 * ```
 */
export async function makeRequest<T>(
    config: AxiosRequestConfig
): Promise<T> {
    try {
        const response = await apiClient.request<ApiResponse<T>>(config);

        if (!response.data.success) {
            throw new APIError(
                response.data.message || 'Request failed',
                response.status,
                response.data
            );
        }

        return response.data.data;
    } catch (error) {
        handleAPIError(error);
    }
}

/**
 * Make a GET request
 */
export async function get<T>(url: string, params?: any): Promise<T> {
    return makeRequest<T>({ method: 'GET', url, params });
}

/**
 * Make a POST request
 */
export async function post<T>(url: string, data?: any): Promise<T> {
    return makeRequest<T>({ method: 'POST', url, data });
}

/**
 * Make a PUT request
 */
export async function put<T>(url: string, data?: any): Promise<T> {
    return makeRequest<T>({ method: 'PUT', url, data });
}

/**
 * Make a PATCH request
 */
export async function patch<T>(url: string, data?: any): Promise<T> {
    return makeRequest<T>({ method: 'PATCH', url, data });
}

/**
 * Make a DELETE request
 */
export async function del<T>(url: string): Promise<T> {
    return makeRequest<T>({ method: 'DELETE', url });
}
