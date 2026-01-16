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

// ==============================
// META CLOUD API WEBHOOK TYPES
// ==============================

/**
 * Main webhook payload structure from Meta
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export interface MetaWebhookPayload {
  object: "whatsapp_business_account";
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string; // WhatsApp Business Account ID
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  value: MetaWebhookValue;
  field: "messages"; // Event type
}

export interface MetaWebhookValue {
  messaging_product: "whatsapp";
  metadata: MetaWebhookMetadata;
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[]; // For message delivery status updates
}

export interface MetaWebhookMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface MetaContact {
  profile: {
    name: string;
  };
  wa_id: string; // WhatsApp ID (phone number)
}

export interface MetaMessage {
  from: string; // Sender phone number
  id: string; // Message ID (wamid) - CRITICAL for idempotency
  timestamp: string; // Unix timestamp as string
  type: "text" | "image" | "video" | "document" | "audio" | "location" | "interactive" | "button";
  
  // Message content based on type
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  button?: {
    payload: string;
    text: string;
  };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface MetaStatus {
  id: string; // Message ID
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

// ==============================
// META API RESPONSE TYPES
// ==============================

export interface MetaSendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string; // wamid of sent message
  }>;
}

export interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: {
      details: string;
    };
    fbtrace_id: string;
  };
}
