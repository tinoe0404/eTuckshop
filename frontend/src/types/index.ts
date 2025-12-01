// Generic API Response
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
  }
  
  
  // Auth
  export interface User {
    id: number;
    name: string;
    email: string;
    role: 'ADMIN' | 'CUSTOMER';
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AuthResponse {
    success: boolean;
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
  }

  export type ProductList = Product[];
  
  // Products
  export interface Product {
    id: number;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    stockLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    categoryId: number;
    category: Category;
    image?: string | null;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Category {
    id: number;
    name: string;
    description: string | null;
    productCount?: number;
    createdAt: string;
    updatedAt: string;
  }
  
  // Cart
  export interface Cart {
    id: number;
    userId: number;
    items: CartItem[];
    totalItems: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CartItem {
    id: number;
    productId: number;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    subtotal: number;
    stock: number;
    stockLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    category: Category;
    image: string | null;
  }
  
  // Orders
  export interface Order {
    id: number;
    orderNumber: string;
    userId: number;
    totalAmount: number;
    paymentType: 'CASH' | 'PAYNOW';
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
    paidAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    orderItems: OrderItem[];
    paymentQR?: PaymentQR;
  }
  
  export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    subtotal: number;
    product: Product;
  }
  
  export interface PaymentQR {
    expiresAt: string | null;
    isUsed: boolean;
    paymentType: 'CASH' | 'PAYNOW';
  }