import { redis } from "./redis";

// Session steps
export type SessionStep =
  | "WELCOME"
  | "MAIN_MENU"
  | "REGISTER_NAME"
  | "REGISTER_EMAIL"
  | "REGISTER_PASSWORD"
  | "LOGIN_EMAIL"
  | "LOGIN_PASSWORD"
  | "BROWSE_CATEGORIES"
  | "BROWSE_PRODUCTS"
  | "PRODUCT_DETAIL"
  | "ADD_QUANTITY"
  | "VIEW_CART"
  | "CHECKOUT_PAYMENT"
  | "ORDER_CONFIRM"
  | "MY_ORDERS"
  | "TRACK_ORDER";

// Session data structure
export interface ChatSession {
  oderId: number | null;
  oderId,
  step: SessionStep;
  isLoggedIn: boolean;
  userId?: number;
  userName?: string;
  userEmail?: string;
  // Registration temp data
  tempName?: string;
  tempEmail?: string;
  // Browsing temp data
  selectedCategoryId?: number;
  selectedProductId?: number;
  tempQuantity?: number;
  // Order temp data
  pendingOrderId?: number;
  lastActivity: string;
}

const SESSION_PREFIX = "chat_session:";
const SESSION_EXPIRY = 60 * 60 * 24; // 24 hours

// Get session by phone number
export const getSession = async (phoneNumber: string): Promise<ChatSession | null> => {
  try {
    const data = await redis.get(`${SESSION_PREFIX}${phoneNumber}`);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    console.error("❌ Failed to get session:", error);
    return null;
  }
};

// Create or update session
export const setSession = async (phoneNumber: string, session: ChatSession): Promise<void> => {
  try {
    session.lastActivity = new Date().toISOString();
    await redis.set(
      `${SESSION_PREFIX}${phoneNumber}`,
      JSON.stringify(session),
      { ex: SESSION_EXPIRY }
    );
  } catch (error) {
    console.error("❌ Failed to set session:", error);
  }
};

// Delete session
export const deleteSession = async (phoneNumber: string): Promise<void> => {
  try {
    await redis.del(`${SESSION_PREFIX}${phoneNumber}`);
  } catch (error) {
    console.error("❌ Failed to delete session:", error);
  }
};

// Create new session
export const createNewSession = (): ChatSession => ({
  oderId,
  step: "WELCOME",
  isLoggedIn: false,
  lastActivity: new Date().toISOString(),
});