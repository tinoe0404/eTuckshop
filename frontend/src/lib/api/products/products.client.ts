import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type {
    CreateProductPayload,
    UpdateProductPayload,
    ProductSearchPayload,
    ProductResponse,
    ProductListResponse,
    DeleteProductResponse,
    Product,
    ProductId,
} from './products.types';

/**
 * Products Service Class
 * Handles all product-related HTTP requests
 */
export class ProductsService extends BaseAPIRequests {
    /**
     * Get all products with optional filtering and pagination
     */
    async getAll(params?: Partial<ProductSearchPayload>): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>('/products', params);
    }

    /**
     * Get a single product by ID
     */
    async getById(id: number): Promise<APIResponse<ProductResponse>> {
        return this.get<ProductResponse>(`/products/${id}`);
    }

    /**
     * Get products by category
     */
    async getByCategory(categoryId: number): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>(`/products/category/${categoryId}`);
    }

    /**
     * Search products by query string
     */
    async search(query: string): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>('/products', { search: query });
    }

    /**
     * Create a new product (Admin only)
     */
    async create(payload: CreateProductPayload): Promise<APIResponse<ProductResponse>> {
        return this.post<ProductResponse>('/products', payload);
    }

    /**
     * Update an existing product (Admin only)
     */
    async update(id: number, payload: UpdateProductPayload): Promise<APIResponse<ProductResponse>> {
        return this.put<ProductResponse>(`/products/${id}`, payload);
    }

    /**
     * Delete a product (Admin only)
     */
    async deleteProduct(id: number): Promise<APIResponse<DeleteProductResponse>> {
        const response = await this.makeRequest<{ id: number }>({
            method: 'DELETE',
            url: `/products/${id}`,
        });

        return {
            ...response,
            data: {
                id: response.data.id as ProductId,
                message: response.message || 'Product deleted successfully',
            },
        };
    }

    /**
     * Bulk delete products (Admin only)
     */
    async bulkDelete(ids: number[]): Promise<APIResponse<{ count: number }>> {
        return this.post<{ count: number }>('/products/bulk-delete', { ids });
    }
}

export const productsService = new ProductsService(apiClient, apiHeaderService);
