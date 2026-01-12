// ============================================
// FILE: src/types/index.ts (FIXED)
// ============================================

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
  image?: string | null;
  emailVerified?: Date | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface UpdateProfileData {
  name: string;
  email: string;
  image?: string;
}

// 👇 PASSWORD MANAGEMENT TYPES (NEW)
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
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
  product: any;
  id: number;
  cartId: number;
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
  createdAt: string;
  updatedAt: string;
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

// ✅ FIXED: Added qrCode property
export interface PaymentQR {
  qrCode: string | null;          // ✅ The actual QR code image (base64 or URL)
  expiresAt: string | null;        // For CASH orders (15min expiry)
  isUsed: boolean;                 // Has this QR been scanned?
  paymentType: 'CASH' | 'PAYNOW';
}

export interface Order {
  id: number;
  orderNumber: string;
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
  paymentQR?: PaymentQR;  // Optional - only exists after QR generation
}

// -----------------------------
// Dashboard Stats
// -----------------------------
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalRevenue: number;
  todayRevenue: number;
  totalCustomers: number;
}

// -----------------------------
// Analytics Types
// -----------------------------
export interface AnalyticsSummary {
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  revenueGrowth: number;
}

export interface DailyStats {
  date: string;
  sales: number;
  revenue: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  category: string;
  image?: string | null;
  totalSold: number;
  orderCount: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyStats: DailyStats[];
  topProducts: TopProduct[];
  recentOrders: Order[];
  dateRange: {
    start: string;
    end: string;
  };
}

// -----------------------------
// QR Details
// -----------------------------
export interface QRDetails {
  orderId: number;
  orderNumber: string;
  paymentType: 'CASH' | 'PAYNOW';
  paymentStatus: 'PENDING' | 'PAID';

  customer: {
    name: string;
    email: string;
  };

  orderSummary: {
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    totalItems: number;
    totalAmount: number;
  };

  qrCode: string;
  expiresAt: string | null;
  paidAt: string | null;
}