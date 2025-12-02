// -----------------------------
// Generic API Response
// -----------------------------
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}



// -----------------------------
// Auth Types
// -----------------------------
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}



// -----------------------------
// Product & Category
// -----------------------------
export interface Category {
  id: number;
  name: string;
  description: string | null;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

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

export type ProductList = Product[];



// -----------------------------
// Cart Types
// -----------------------------
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

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}



// -----------------------------
// Order Types
// -----------------------------
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


export interface Order {
  id: number;
  orderNumber: string;

  // Helpful for admin pages (order.user?.name, etc.)
  userId: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };

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
