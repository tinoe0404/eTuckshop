import { z } from 'zod';
import {
    createProductSchema,
    updateProductSchema,
    productSearchSchema,
    productIdSchema,
} from './products.schemas';

// ============================================
// BRANDED TYPES
// ============================================

/**
 * Branded type for Product IDs to prevent mixing with other ID types
 */
export type ProductId = number & { readonly __brand: 'ProductId' };

/**
 * Branded type for Category IDs
 */
export type CategoryId = number & { readonly __brand: 'CategoryId' };

// ============================================
// PAYLOAD TYPES (Inferred from Schemas)
// ============================================

/**
 * Payload for creating a new product
 * Inferred from createProductSchema
 * 
 * @example
 * ```typescript
 * const payload: CreateProductPayload = {
 *   name: 'Chocolate Bar',
 *   description: 'Delicious milk chocolate',
 *   price: 2.50,
 *   stock: 100,
 *   categoryId: 5,
 *   image: 'https://example.com/chocolate.jpg'
 * };
 * ```
 */
export type CreateProductPayload = z.infer<typeof createProductSchema>;

/**
 * Payload for updating a product
 * All fields optional for partial updates
 */
export type UpdateProductPayload = z.infer<typeof updateProductSchema>;

/**
 * Payload for product search/filtering
 */
export type ProductSearchPayload = z.infer<typeof productSearchSchema>;

// ============================================
// ENTITY TYPES
// ============================================

/**
 * Stock level indicator
 */
export type StockLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Category entity (simplified for product context)
 */
export type Category = {
    readonly id: CategoryId;
    readonly name: string;
    readonly description: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

/**
 * Product entity
 * 
 * @property id - Unique product identifier
 * @property name - Product name
 * @property description - Optional product description
 * @property price - Price in currency units
 * @property stock - Current stock quantity
 * @property stockLevel - Computed stock level (LOW/MEDIUM/HIGH)
 * @property categoryId - Foreign key to category
 * @property category - Full category object
 * @property image - Optional product image URL
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export type Product = {
    readonly id: ProductId;
    readonly name: string;
    readonly description: string | null;
    readonly price: number;
    readonly stock: number;
    readonly stockLevel: StockLevel;
    readonly categoryId: CategoryId;
    readonly category: Category;
    readonly image: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Single product response
 */
export type ProductResponse = Product;

/**
 * List of products response
 */
export type ProductListResponse = readonly Product[];

/**
 * Paginated products response
 */
export type PaginatedProductsResponse = {
    readonly data: readonly Product[];
    readonly pagination: {
        readonly page: number;
        readonly limit: number;
        readonly total: number;
        readonly totalPages: number;
    };
};

/**
 * Product deletion response
 */
export type DeleteProductResponse = {
    readonly id: ProductId;
    readonly message: string;
};

/**
 * Error response from product endpoints
 */
export type ProductErrorResponse = {
    readonly error: string;
    readonly message: string;
    readonly statusCode: number;
};
