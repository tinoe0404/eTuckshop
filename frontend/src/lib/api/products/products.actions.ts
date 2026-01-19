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
 * Fetches products with optional filtering and pagination
 * 
 * @param params - Optional search/filter parameters
 * @returns APIResponse with products array or error
 */
export async function getProductsAction(
    params?: Partial<ProductSearchPayload>
): Promise<APIResponse<ProductListResponse>> {
    try {
        // Validate params if provided
        if (params && Object.keys(params).length > 0) {
            productSearchSchema.parse(params);
        }

        const response = await productsService.getAll(params);
        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid search parameters',
                data: [],
                error: firstError?.message,
            };
        }

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
 * Server Action: Get Product By ID
 * Fetches a single product by its ID
 * 
 * @param id - Product ID
 * @returns APIResponse with product or error
 */
export async function getProductByIdAction(id: number): Promise<APIResponse<Product | null>> {
    try {
        // Validate ID
        productIdSchema.parse(id);

        const response = await productsService.getById(id);
        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Invalid product ID',
                data: null,
                error: 'Invalid product ID',
            };
        }

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
 * Server Action: Create Product
 * Creates a new product (Admin only)
 * 
 * @param prevState - Previous state from useActionState
 * @param formData - Form data
 * @returns APIResponse with created product or error
 */
export async function createProductAction(
    prevState: any,
    formData: FormData
): Promise<APIResponse<Product | null>> {
    try {
        // Extract form data
        const payload = {
            name: formData.get('name') as string,
            description: formData.get('description') as string || null,
            price: parseFloat(formData.get('price') as string),
            stock: parseInt(formData.get('stock') as string, 10),
            categoryId: parseInt(formData.get('categoryId') as string, 10),
            image: formData.get('image') as string || null,
        };

        // Validate with Zod
        const validated = createProductSchema.parse(payload);

        // Call service
        const response = await productsService.create(validated);

        // Revalidate products page
        revalidatePath('/products');
        revalidatePath('/admin/products');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid product data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[createProductAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create product',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Update Product
 * Updates an existing product (Admin only)
 * 
 * @param id - Product ID
 * @param prevState - Previous state from useActionState
 * @param formData - Form data
 * @returns APIResponse with updated product or error
 */
export async function updateProductAction(
    id: number,
    prevState: any,
    formData: FormData
): Promise<APIResponse<Product | null>> {
    try {
        // Validate ID
        productIdSchema.parse(id);

        // Extract form data (only fields that are present)
        const payload: any = {};

        const name = formData.get('name');
        if (name) payload.name = name as string;

        const description = formData.get('description');
        if (description !== null) payload.description = description as string || null;

        const price = formData.get('price');
        if (price) payload.price = parseFloat(price as string);

        const stock = formData.get('stock');
        if (stock) payload.stock = parseInt(stock as string, 10);

        const categoryId = formData.get('categoryId');
        if (categoryId) payload.categoryId = parseInt(categoryId as string, 10);

        const image = formData.get('image');
        if (image !== null) payload.image = image as string || null;

        // Validate with Zod
        const validated = updateProductSchema.parse(payload);

        // Call service
        const response = await productsService.update(id, validated);

        // Revalidate products pages
        revalidatePath('/products');
        revalidatePath(`/products/${id}`);
        revalidatePath('/admin/products');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid product data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[updateProductAction] Error:', error);
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
 * Deletes a product (Admin only)
 * 
 * @param id - Product ID
 * @returns APIResponse with success message or error
 */
export async function deleteProductAction(id: number): Promise<APIResponse<{ id: number; message: string } | null>> {
    try {
        // Validate ID
        productIdSchema.parse(id);

        // Call service
        const response = await productsService.delete(id);

        // Revalidate products pages
        revalidatePath('/products');
        revalidatePath('/admin/products');

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Invalid product ID',
                data: null,
                error: 'Invalid product ID',
            };
        }

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
 * Server Action: Get Admin Products
 * Wrapper for getting products for admin view
 */
export async function getAdminProductsAction(params?: Partial<ProductSearchPayload>): Promise<APIResponse<ProductListResponse>> {
    return getProductsAction(params);
}
