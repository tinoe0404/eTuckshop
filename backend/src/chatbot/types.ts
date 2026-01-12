// src/chatbot/types.ts

// ==============================
// BOT STATES
// ==============================
export enum BotState {
  START = "START",

  // Browsing
  BROWSING_CATEGORIES = "BROWSING_CATEGORIES",
  BROWSING_PRODUCTS = "BROWSING_PRODUCTS",
  PRODUCT_DETAIL = "PRODUCT_DETAIL",

  // Cart & Checkout
  VIEWING_CART = "VIEWING_CART",
  AWAITING_QUANTITY = "AWAITING_QUANTITY",

  // Order Flow
  CHECKOUT_CONFIRM = "CHECKOUT_CONFIRM",
  AWAITING_ADDRESS = "AWAITING_ADDRESS",
  AWAITING_PAYMENT_PROOF = "AWAITING_PAYMENT_PROOF",
}

// ==============================
// BOT CONTEXT
// ==============================
export interface BotContext {
  phoneNumber: string; // WhatsApp ID (26377...)
  name: string;
  message: string;
}

// ==============================
// SESSION DATA (REDIS)
// ==============================
export interface SessionData {
  currentCategoryId?: number;
  currentProductId?: number;
  tempQuantity?: number;
  cartTotal?: number;

  // Extended
  listMapping?: Record<string, number>;
  maxStock?: number;
}
