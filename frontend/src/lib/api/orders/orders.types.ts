import { z } from 'zod';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schemas';
import type { Product } from '../products/products.types';

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

export type OrderStats = {
    orders: {
        total: number;
        pending: number;
        paid: number;
        completed: number;
        cancelled: number;
    };
    revenue: number;
};

export type CheckoutPayload = {
    paymentType: 'CASH' | 'PAYNOW';
};

export type CheckoutResponse = {
    orderId: number;
    orderNumber: string;
    totalAmount: number;
    paymentType: string;
    status: string;
    nextStep: { action: string; url: string; note: string };
};

export type PayNowResponse = {
    orderId: number;
    paymentUrl: string;
    paymentRef: string;
    amount: number;
    currency: string;
    instructions: string;
};

export type OrderQRResponse = {
    orderId: number;
    qrCode: string;
    expiresAt: string | null;
    isUsed: boolean;
    paymentStatus: string;
    orderSummary: { totalItems: number; totalAmount: number };
};

export type CashQRResponse = {
    qrCode: string;
    expiresAt: string;
    expiresIn: string;
};

export type ScanQRPayload = {
    qrData: string;
};

export type ScanQRResponse = {
    paymentMethod: { type: string; status: string };
    customer: { name: string; email: string };
    orderInfo: { orderId: number; status: string };
    action: { complete: string };
};

export type OrderResponse = Order;
export type OrderListResponse = {
    orders: Order[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
};
