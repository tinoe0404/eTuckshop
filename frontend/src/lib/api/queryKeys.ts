// ============================================
// FILE: src/lib/api/queryKeys.ts (REFACTORED)
// ============================================

/**
 * ✅ BEST PRACTICE: Centralized query keys
 * - Type-safe
 * - Hierarchical structure
 * - Easy invalidation
 */

export const queryKeys = {
  // ========================
  // PRODUCTS
  // ========================
  products: {
    // Base key for all product queries
    all: ['products'] as const,
    
    // List queries (with optional filters)
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: {
      search?: string;
      categoryId?: number;
      sortBy?: string;
      priceRange?: string;
      stockFilter?: string;
    }) => [...queryKeys.products.lists(), filters] as const,
    
    // Detail queries
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
    
    // Special queries
    inventory: () => [...queryKeys.products.all, 'inventory'] as const,
    byCategory: (categoryId: number) => 
      [...queryKeys.products.all, 'category', categoryId] as const,
  },
  
  // ========================
  // CATEGORIES
  // ========================
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.categories.details(), id] as const,
    stats: () => [...queryKeys.categories.all, 'stats'] as const,
  },
  
  // ========================
  // CART
  // ========================
  cart: {
    all: ['cart'] as const,
    details: () => [...queryKeys.cart.all, 'detail'] as const,
    summary: () => [...queryKeys.cart.all, 'summary'] as const,
  },
  
  // ========================
  // ORDERS
  // ========================
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: {
      status?: string;
      paymentType?: string;
      page?: number;
      limit?: number;
    }) => [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.orders.details(), id] as const,
    stats: () => [...queryKeys.orders.all, 'stats'] as const,
    userOrders: () => [...queryKeys.orders.all, 'user'] as const,
    qr: (orderId: number) => [...queryKeys.orders.all, 'qr', orderId] as const,
  },
  
  // ========================
  // CUSTOMERS
  // ========================
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: {
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      order?: 'asc' | 'desc';
    }) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.customers.details(), id] as const,
    stats: () => [...queryKeys.customers.all, 'stats'] as const,
  },
  
  // ========================
  // DASHBOARD
  // ========================
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },
  
  // ========================
  // ANALYTICS
  // ========================
  analytics: {
    all: ['analytics'] as const,
    summary: (dateRange?: { start: string; end: string }) => 
      [...queryKeys.analytics.all, 'summary', dateRange] as const,
  },
} as const;

/**
 * ✅ HELPER: Invalidate all product-related queries
 */
export const invalidateProductQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
};

/**
 * ✅ HELPER: Invalidate all cart-related queries
 */
export const invalidateCartQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
};

/**
 * ✅ HELPER: Invalidate all order-related queries
 */
export const invalidateOrderQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
};