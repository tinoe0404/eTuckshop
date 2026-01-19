import { apiClient } from '../apiClient';
import {
    createProductSchema,
    updateProductSchema,
    productSearchSchema,
    productIdSchema,
} from './schema';
import type {
    CreateProductPayload,
    UpdateProductPayload,
    ProductSearchPayload,
    ProductResponse,
    ProductListResponse,
    ProductId,
    CategoryId,
    DeleteProductResponse,
} from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

// ============================================
// PRODUCT API CLIENT
// ============================================

/**
 * Get all products with optional filtering and pagination
 * 
 * @param params - Optional search, filter, pagination parameters
 * @returns Array of products
 * @throws {Error} If request fails
 * 
 * @example
 * ```typescript
 * // Get all products
 * const products = await getAllProducts();
 * 
 * // Search and filter
 * const filtered = await getAllProducts({
 *   search: 'chocolate',
 *   categoryId: 5,
 *   inStock: true,
 *   limit: 10,
 *   page: 1
 * });
 * ```
 */
export async function getAllProducts(
    params?: Partial<ProductSearchPayload>
): Promise<ProductListResponse> {
    try {
        // Validate params if provided
        const validated = params ? productSearchSchema.parse(params) : {};

        const response = await apiClient.get<ApiResponse<ProductListResponse>>(
            '/products',
            { params: validated, signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch products');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid search parameters');
        }

        console.error('Get all products error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to fetch products. Please try again.');
    }
}

/**
 * Get a single product by ID
 * 
 * @param id - Product ID
 * @returns Product details
 * @throws {Error} If product not found or request fails
 * 
 * @example
 * ```typescript
 * const product = await getProductById(123);
 * console.log(product.name, product.price);
 * ```
 */
export async function getProductById(id: number): Promise<ProductResponse> {
    try {
        // Validate product ID
        const validatedId = productIdSchema.parse(id);

        const response = await apiClient.get<ApiResponse<ProductResponse>>(
            `/products/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Product not found');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid product ID');
        }

        console.error('Get product by ID error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to fetch product. Please try again.');
    }
}

/**
 * Get products by category
 * 
 * @param categoryId - Category ID
 * @returns Array of products in the category
 * @throws {Error} If request fails
 * 
 * @example
 * ```typescript
 * const snacks = await getProductsByCategory(3);
 * ```
 */
export async function getProductsByCategory(
    categoryId: number
): Promise<ProductListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<ProductListResponse>>(
            `/products/category/${categoryId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch products');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get products by category error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to fetch products by category. Please try again.');
    }
}

/**
 * Search products by query string
 * 
 * @param query - Search query
 * @returns Array of matching products
 * @throws {Error} If request fails
 * 
 * @example
 * ```typescript
 * const results = await searchProducts('chocolate chip');
 * ```
 */
export async function searchProducts(query: string): Promise<ProductListResponse> {
    try {
        const response = await apiClient.get<ApiResponse<ProductListResponse>>(
            '/products',
            {
                params: { search: query },
                signal: AbortSignal.timeout(10000),
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Search failed');
        }

        return response.data.data;
    } catch (error) {
        console.error('Search products error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to search products. Please try again.');
    }
}

/**
 * Create a new product (Admin only)
 * 
 * @param payload - Product data
 * @returns Created product
 * @throws {Error} If validation fails or creation errors
 * 
 * @example
 * ```typescript
 * const newProduct = await createProduct({
 *   name: 'Chocolate Bar',
 *   description: 'Delicious milk chocolate',
 *   price: 2.50,
 *   stock: 100,
 *   categoryId: 5,
 *   image: 'https://example.com/chocolate.jpg'
 * });
 * ```
 */
export async function createProduct(
    payload: CreateProductPayload
): Promise<ProductResponse> {
    try {
        // Validate payload
        const validated = createProductSchema.parse(payload);

        const response = await apiClient.post<ApiResponse<ProductResponse>>(
            '/products',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to create product');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid product data');
        }

        console.error('Create product error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to create product. Please try again.');
    }
}

/**
 * Update an existing product (Admin only)
 * 
 * @param id - Product ID
 * @param payload - Fields to update (partial)
 * @returns Updated product
 * @throws {Error} If validation fails or update errors
 * 
 * @example
 * ```typescript
 * const updated = await updateProduct(123, {
 *   price: 3.00,
 *   stock: 50
 * });
 * ```
 */
export async function updateProduct(
    id: number,
    payload: UpdateProductPayload
): Promise<ProductResponse> {
    try {
        // Validate ID and payload
        const validatedId = productIdSchema.parse(id);
        const validated = updateProductSchema.parse(payload);

        const response = await apiClient.put<ApiResponse<ProductResponse>>(
            `/products/${validatedId}`,
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update product');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid product data');
        }

        console.error('Update product error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to update product. Please try again.');
    }
}

/**
 * Delete a product (Admin only)
 * 
 * @param id - Product ID
 * @returns Deletion confirmation
 * @throws {Error} If deletion fails
 * 
 * @example
 * ```typescript
 * await deleteProduct(123);
 * console.log('Product deleted successfully');
 * ```
 */
export async function deleteProduct(id: number): Promise<DeleteProductResponse> {
    try {
        // Validate ID
        const validatedId = productIdSchema.parse(id);

        const response = await apiClient.delete<ApiResponse<{ id: number }>>(
            `/products/${validatedId}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete product');
        }

        return {
            id: response.data.data.id as ProductId,
            message: response.data.message || 'Product deleted successfully',
        };
    } catch (error) {
        if (error instanceof ZodError) {
            throw new Error('Invalid product ID');
        }

        console.error('Delete product error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to delete product. Please try again.');
    }
}
