import { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { APIResponse, APIError } from './types';
import { APIHeaderService } from './apiHeaderService';

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
 * Base class for all API service classes
 * Provides common HTTP methods with consistent error handling and typing
 */
export class BaseAPIRequests {
    protected client: AxiosInstance;
    protected headerService: APIHeaderService;

    constructor(client: AxiosInstance, headerService: APIHeaderService) {
        this.client = client;
        this.headerService = headerService;
    }

    /**
     * Make a type-safe API request with consistent error handling
     * 
     * @template T - The expected data type from the API
     * @param config - Axios request configuration
     * @returns Promise with APIResponse wrapper
     * @throws {APIError} If the request fails or validation fails
     */
    protected async makeRequest<T>(
        config: AxiosRequestConfig
    ): Promise<APIResponse<T>> {
        try {
            const response = await this.client.request<APIResponse<T>>(config);

            if (!response.data.success) {
                throw new APIError(
                    response.data.message || 'Request failed',
                    response.status,
                    response.data
                );
            }

            return response.data;
        } catch (error) {
            handleAPIError(error);
        }
    }

    /**
     * Make a GET request
     */
    protected async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
        return this.makeRequest<T>({ ...config, method: 'GET', url, params });
    }

    /**
     * Make a POST request
     */
    protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
        return this.makeRequest<T>({ ...config, method: 'POST', url, data });
    }

    /**
     * Make a PUT request
     */
    protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
        return this.makeRequest<T>({ ...config, method: 'PUT', url, data });
    }

    /**
     * Make a PATCH request
     */
    protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
        return this.makeRequest<T>({ ...config, method: 'PATCH', url, data });
    }

    /**
     * Make a DELETE request
     */
    protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
        return this.makeRequest<T>({ ...config, method: 'DELETE', url });
    }
}
