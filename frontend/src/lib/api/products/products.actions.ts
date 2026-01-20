'use server';

import { revalidatePath } from 'next/cache';
import { productsService } from './products.client';
import {
    createProductSchema,
    updateProductSchema,
    productSearchSchema,
    productIdSchema,
} from './products.schemas';
import type {
    Product,
    ProductListResponse,
    CreateProductPayload,
    UpdateProductPayload,
    ProductSearchPayload,
} from './products.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

/**
 * Server Action: Get All Products
 */
export async function getProductsAction(
    params?: Partial<ProductSearchPayload>
): Promise<APIResponse<ProductListResponse>> {
    try {
        if (params && Object.keys(params).length > 0) {
            productSearchSchema.parse(params);
        }
        return await productsService.getAll(params);
    } catch (error) {
        console.error('[getProductsAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch products',
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Get Admin Products (Wrapper)
 */
export async function getAdminProductsAction(params?: Partial<ProductSearchPayload>): Promise<APIResponse<ProductListResponse>> {
    return getProductsAction(params);
}

/**
 * Server Action: Get Product By ID
 */
export async function getProductByIdAction(id: number): Promise<APIResponse<Product | null>> {
    try {
        productIdSchema.parse(id);
        return await productsService.getById(id);
    } catch (error) {
        console.error('[getProductByIdAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch product',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Create Product (JSON)
 */
export async function createProduct(payload: CreateProductPayload): Promise<APIResponse<Product | null>> {
    try {
        const validated = createProductSchema.parse(payload);
        const response = await productsService.create(validated);
        revalidatePath('/products');
        revalidatePath('/admin/products');
        return response;
    } catch (error) {
        console.error('[createProduct] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create product',
            data: null, // Return null on error
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Update Product (JSON)
 */
export async function updateProduct(id: number, payload: UpdateProductPayload): Promise<APIResponse<Product | null>> {
    try {
        productIdSchema.parse(id);
        const validated = updateProductSchema.parse(payload);
        const response = await productsService.update(id, validated);
        revalidatePath('/products');
        revalidatePath(`/products/${id}`);
        revalidatePath('/admin/products');
        return response;
    } catch (error) {
        console.error('[updateProduct] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update product',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Delete Product
 */
export async function deleteProductAction(id: number): Promise<APIResponse<{ id: number; message: string } | null>> {
    try {
        productIdSchema.parse(id);
        const response = await productsService.deleteProduct(id);
        revalidatePath('/products');
        revalidatePath('/admin/products');
        return response;
    } catch (error) {
        console.error('[deleteProductAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete product',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Bulk Delete Products
 */
export async function bulkDeleteProductsAction(ids: number[]): Promise<APIResponse<{ count: number } | null>> {
    try {
        const response = await productsService.bulkDelete(ids);
        revalidatePath('/products');
        revalidatePath('/admin/products');
        return response;
    } catch (error) {
        console.error('[bulkDeleteProductsAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to bulk delete products',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
