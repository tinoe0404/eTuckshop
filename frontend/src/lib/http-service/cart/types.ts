import { z } from 'zod';
import { addToCartSchema, updateCartItemSchema, cartItemIdSchema } from './schema';
import { UserId } from '../auth/types';
import type { Product, Category, StockLevel } from '../products/types';

// ============================================
// BRANDED TYPES
// ============================================

export type CartId = number & { readonly __brand: 'CartId' };
export type CartItemId = number & { readonly __brand: 'CartItemId' };

// ============================================
// PAYLOAD TYPES
// ============================================

export type AddToCartPayload = z.infer<typeof addToCartSchema>;
export type UpdateCartItemPayload = z.infer<typeof updateCartItemSchema>;

// ============================================
// ENTITY TYPES
// ============================================

/**
 * Cart item with product details
 */
export type CartItem = {
    readonly id: CartItemId;
    readonly cartId: CartId;
    readonly productId: number;
    readonly name: string;
    readonly description: string | null;
    readonly price: number;
    readonly quantity: number;
    readonly subtotal: number;
    readonly stock: number;
    readonly stockLevel: StockLevel;
    readonly category: Category;
    readonly image: string | null;
    readonly product: Product;
    readonly createdAt: string;
    readonly updatedAt: string;
};

/**
 * Shopping cart
 */
export type Cart = {
    readonly id: CartId;
    readonly userId: UserId;
    readonly items: CartItem[];
    readonly totalItems: number;
    readonly totalAmount: number;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type CartSummary = {
    readonly totalItems: number;
    readonly totalAmount: number;
};


// ============================================
// RESPONSE TYPES
// ============================================

export type CartResponse = Cart;

export type CartItemResponse = CartItem;
