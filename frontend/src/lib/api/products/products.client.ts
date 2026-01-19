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
     * 
     * @param params - Optional search, filter, pagination parameters
     * @returns Array of products wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * // Get all products
     * const response = await productsService.getAll();
     * 
     * // Search and filter
     * const filtered = await productsService.getAll({
     *   search: 'chocolate',
     *   categoryId: 5,
     *   inStock: true,
     *   limit: 10,
     *   page: 1
     * });
     * ```
     */
    async getAll(params?: Partial<ProductSearchPayload>): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>('/products', params);
    }

    /**
     * Get a single product by ID
     * 
     * @param id - Product ID
     * @returns Product details wrapped in APIResponse
     * @throws {APIError} If product not found or request fails
     * 
     * @example
     * ```typescript
     * const response = await productsService.getById(123);
     * console.log(response.data.name, response.data.price);
     * ```
     */
    async getById(id: number): Promise<APIResponse<ProductResponse>> {
        return this.get<ProductResponse>(`/products/${id}`);
    }

    /**
     * Get products by category
     * 
     * @param categoryId - Category ID
     * @returns Array of products in the category wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await productsService.getByCategory(3);
     * ```
     */
    async getByCategory(categoryId: number): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>(`/products/category/${categoryId}`);
    }

    /**
     * Search products by query string
     * 
     * @param query - Search query
     * @returns Array of matching products wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await productsService.search('chocolate chip');
     * ```
     */
    async search(query: string): Promise<APIResponse<ProductListResponse>> {
        return this.get<ProductListResponse>('/products', { search: query });
    }

    /**
     * Create a new product (Admin only)
     * 
     * @param payload - Product data
     * @returns Created product wrapped in APIResponse
     * @throws {APIError} If validation fails or creation errors
     * 
     * @example
     * ```typescript
     * const response = await productsService.create({
     *   name: 'Chocolate Bar',
     *   description: 'Delicious milk chocolate',
     *   price: 2.50,
     *   stock: 100,
     *   categoryId: 5,
     *   image: 'https://example.com/chocolate.jpg'
     * });
     * ```
     */
    async create(payload: CreateProductPayload): Promise<APIResponse<ProductResponse>> {
        return this.post<ProductResponse>('/products', payload);
    }

    /**
     * Update an existing product (Admin only)
     * 
     * @param id - Product ID
     * @param payload - Fields to update (partial)
     * @returns Updated product wrapped in APIResponse
     * @throws {APIError} If validation fails or update errors
     * 
     * @example
     * ```typescript
     * const response = await productsService.update(123, {
     *   price: 3.00,
     *   stock: 50
     * });
     * ```
     */
    async update(id: number, payload: UpdateProductPayload): Promise<APIResponse<ProductResponse>> {
        return this.put<ProductResponse>(`/products/${id}`, payload);
    }

    /**
     * Delete a product (Admin only)
     * 
     * @param id - Product ID
     * @returns Deletion confirmation wrapped in APIResponse
     * @throws {APIError} If deletion fails
     * 
     * @example
     * ```typescript
     * const response = await productsService.delete(123);
     * console.log(response.message); // 'Product deleted successfully'
     * ```
     */
    async delete(id: number): Promise<APIResponse<DeleteProductResponse>> {
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
}

// Export singleton instance
export const productsService = new ProductsService(apiClient, apiHeaderService);
