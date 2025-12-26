// ============================================
// FILE: src/lib/api/queryKeys.ts (REFACTORED)
// ============================================

/**
 * ✅ BEST PRACTICE: Centralized query keys
 * - Type-safe
 * - Hierarchical structure
 * - Easy invalidation
 * - Follows React Query v5 recommendations
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
  // CUSTOMERS (ADMIN)
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
  // ANALYTICS (ADMIN)
  // ========================
  analytics: {
    all: ['analytics'] as const,
    
    // Dashboard stats (main admin page)
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    
    // Detailed analytics with date range filters
    details: () => [...queryKeys.analytics.all, 'detail'] as const,
    detail: (params?: { startDate?: string; endDate?: string }) => 
      [...queryKeys.analytics.details(), params] as const,
  },
} as const;

// ============================================
// HELPER FUNCTIONS FOR INVALIDATION
// ============================================

/**
 * ✅ HELPER: Invalidate all product-related queries
 * Use after: create/update/delete product
 */
export const invalidateProductQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
};

/**
 * ✅ HELPER: Invalidate all cart-related queries
 * Use after: add to cart, remove from cart, update quantity
 */
export const invalidateCartQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
};

/**
 * ✅ HELPER: Invalidate all order-related queries
 * Use after: create order, update order status, payment completion
 */
export const invalidateOrderQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
};

/**
 * ✅ HELPER: Invalidate all analytics queries
 * Use after: order completion, product changes, major data updates
 */
export const invalidateAnalyticsQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
};

/**
 * ✅ HELPER: Invalidate all customer queries
 * Use after: customer updates, role changes
 */
export const invalidateCustomerQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
};

/**
 * ✅ HELPER: Invalidate all category queries
 * Use after: create/update/delete category
 */
export const invalidateCategoryQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
};

// ============================================
// TYPE EXPORTS
// ============================================

export type QueryKeys = typeof queryKeys;