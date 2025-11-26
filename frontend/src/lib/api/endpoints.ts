export const API_ENDPOINTS = {
    // Auth
    AUTH: {
      SIGNUP: "/auth/signup",
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      PROFILE: "/auth/profile",
    },
  
    // Products
    PRODUCTS: {
      BASE: "/products",
      BY_ID: (id: number) => `/products/${id}`,
      BY_CATEGORY: (categoryId: number) => `/products/category/${categoryId}`,
    },
  
    // Categories
    CATEGORIES: {
      BASE: "/categories",
      BY_ID: (id: number) => `/categories/${id}`,
      STATS: "/categories/admin/stats",
    },
  
    // Cart
    CART: {
      BASE: "/cart",
      SUMMARY: "/cart/summary",
      ADD: "/cart/add",
      UPDATE: "/cart/update",
      REMOVE: (productId: number) => `/cart/remove/${productId}`,
      CLEAR: "/cart/clear",
    },
  
    // Orders
    ORDERS: {
      BASE: "/orders",
      BY_ID: (id: number) => `/orders/${id}`,
      CHECKOUT: "/orders/checkout",
      GENERATE_QR: (orderId: number) => `/orders/generate-qr/${orderId}`,
      PAYNOW: (orderId: number) => `/orders/pay/paynow/${orderId}`,
      QR: (orderId: number) => `/orders/qr/${orderId}`,
      CANCEL: (orderId: number) => `/orders/cancel/${orderId}`,
      
      // Admin
      ADMIN: {
        ALL: "/orders/admin/all",
        STATS: "/orders/admin/stats",
        BY_ID: (orderId: number) => `/orders/admin/${orderId}`,
        SCAN_QR: "/orders/admin/scan-qr",
        COMPLETE: (orderId: number) => `/orders/admin/complete/${orderId}`,
        REJECT: (orderId: number) => `/orders/admin/reject/${orderId}`,
      },
    },
  } as const;