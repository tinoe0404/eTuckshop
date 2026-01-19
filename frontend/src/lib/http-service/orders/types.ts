import { z } from 'zod';
import { createOrderSchema, updateOrderStatusSchema } from './schema';
import type { Product } from '../products/types';

// ============================================
// BRANDED TYPES
// ============================================

export type OrderId = number & { readonly __brand: 'OrderId' };
export type OrderItemId = number & { readonly __brand: 'OrderItemId' };

// ============================================
// ENUMS
// ============================================

export type PaymentType = 'CASH' | 'PAYNOW';
export type OrderStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';

// ============================================
// PAYLOAD TYPES
// ============================================

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusPayload = z.infer<typeof updateOrderStatusSchema>;

// ============================================
// ENTITY TYPES
// ============================================

export type OrderItem = {
    readonly id: OrderItemId;
    readonly orderId: OrderId;
    readonly productId: number;
    readonly quantity: number;
    readonly subtotal: number;
    readonly product: Product;
};

export type PaymentQR = {
    readonly qrCode: string | null;
    readonly expiresAt: string | null;
    readonly isUsed: boolean;
    readonly paymentType: PaymentType;
};

export type Order = {
    readonly id: OrderId;
    readonly orderNumber: string;
    readonly userId: number;
    readonly user?: {
        readonly id: number;
        readonly name: string;
        readonly email: string;
    };
    readonly totalAmount: number;
    readonly paymentType: PaymentType;
    readonly status: OrderStatus;
    readonly paidAt: string | null;
    readonly completedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly orderItems: readonly OrderItem[];
    readonly paymentQR?: PaymentQR;
};

// ============================================
// RESPONSE TYPES
// ============================================

export type OrderResponse = Order;
export type OrderListResponse = readonly Order[];
