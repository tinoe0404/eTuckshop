/**
 * Standard API response wrapper
 * All API endpoints return this structure
 */
export interface APIResponse<T> {
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
