// ============================================================
// src/services/chatbot.service.ts
// ============================================================
import { prisma } from "../utils/db";
import {
  ChatSession,
  getSession,
  setSession,
  createNewSession,
  deleteSession,
} from "../utils/chatSession";
import { MESSAGES } from "../utils/chatMessages";
import { generateQRCode, QRPayload } from "../utils/qrCode";

// ==========================================
// MAIN MESSAGE HANDLER
// ==========================================
export const handleIncomingMessage = async (
  phoneNumber: string,
  message: string
): Promise<string> => {
  try {
    const input = message.trim().toLowerCase();
    
    // Get or create session
    let session = await getSession(phoneNumber);
    if (!session) {
      session = createNewSession();
      await setSession(phoneNumber, session);
    }

    // Global commands
    if (input === "menu" || input === "home") {
      if (session.isLoggedIn) {
        session.step = "MAIN_MENU";
        await setSession(phoneNumber, session);
        return MESSAGES.MAIN_MENU(session.userName || "Customer");
      } else {
        session.step = "WELCOME";
        await setSession(phoneNumber, session);
        return MESSAGES.WELCOME;
      }
    }

    if (input === "help") {
      return MESSAGES.HELP;
    }

    // Route to appropriate handler based on step
    switch (session.step) {
      case "WELCOME":
        return handleWelcome(phoneNumber, input, session);
      case "REGISTER_NAME":
        return handleRegisterName(phoneNumber, message, session);
      case "REGISTER_EMAIL":
        return handleRegisterEmail(phoneNumber, message, session);
      case "REGISTER_PASSWORD":
        return handleRegisterPassword(phoneNumber, message, session);
      case "LOGIN_EMAIL":
        return handleLoginEmail(phoneNumber, message, session);
      case "LOGIN_PASSWORD":
        return handleLoginPassword(phoneNumber, message, session);
      case "MAIN_MENU":
        return handleMainMenu(phoneNumber, input, session);
      case "BROWSE_CATEGORIES":
        return handleBrowseCategories(phoneNumber, input, session);
      case "BROWSE_PRODUCTS":
        return handleBrowseProducts(phoneNumber, input, session);
      case "PRODUCT_DETAIL":
        return handleProductDetail(phoneNumber, input, session);
      case "ADD_QUANTITY":
        return handleAddQuantity(phoneNumber, input, session);
      case "VIEW_CART":
        return handleViewCart(phoneNumber, input, session);
      case "CHECKOUT_PAYMENT":
        return handleCheckoutPayment(phoneNumber, input, session);
      case "MY_ORDERS":
        return handleMyOrders(phoneNumber, input, session);
      case "TRACK_ORDER":
        return handleTrackOrder(phoneNumber, message, session);
      default:
        session.step = "WELCOME";
        await setSession(phoneNumber, session);
        return MESSAGES.WELCOME;
    }
  } catch (error) {
    console.error("❌ Chatbot error:", error);
    return MESSAGES.ERROR;
  }
};


// WELCOME HANDLER
// ==========================================
const handleWelcome = async (
  phoneNumber: string,
  input: string,
  session: ChatSession
): Promise<string> => {
  if (input === "1") {
    session.step = "REGISTER_NAME";
    await setSession(phoneNumber, session);
    return MESSAGES.REGISTER_NAME;
  } else if (input === "2") {
    session.step = "LOGIN_EMAIL";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_EMAIL;
  } else if (input === "hi" || input === "hello" || input === "start") {
    return MESSAGES.WELCOME;
  }
  return MESSAGES.WELCOME;
};

// ==========================================
// REGISTRATION HANDLERS
// ==========================================
const handleRegisterName = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    if (input.length < 2) {
      return "Please enter a valid name (at least 2 characters).";
    }
    session.tempName = input;
    session.step = "REGISTER_EMAIL";
    await setSession(phoneNumber, session);
    return MESSAGES.REGISTER_EMAIL;
  };

// ==========================================
// LOGIN HANDLERS
// ==========================================
const handleLoginEmail = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    session.tempEmail = input;
    session.step = "LOGIN_PASSWORD";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_PASSWORD;
  };
  
