// src/chatbot/bot.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { getUserState, setUserState, clearSession } from "./state";
import { BotState } from "./types";
import { formatPhoneNumber } from "./messageUtils";

// Import Handlers (We will create these next)
import { handleMainMenu } from "./handlers/menu";
import { handleCatalog } from "./handlers/catalog";
import { handleCart } from "./handlers/cart";
// import { handleCheckout } from "./handlers/order"; 

export const webhook = async (c: Context) => {
  try {
    // 1. Parse Incoming Message
    // Note: The structure depends on your provider (Twilio, Meta, Ultramsg, etc.)
    // I will assume a generic JSON payload for now.
    const body = await c.req.json();
    
    // ADJUST THIS based on your actual WhatsApp Provider
    const rawPhone = body.from || body.phone; 
    const messageBody = body.text || body.body || ""; 
    const pushName = body.pushname || "Guest";

    if (!rawPhone || !messageBody) {
      return c.json({ status: "ignored", reason: "no_data" });
    }

    const phoneNumber = formatPhoneNumber(rawPhone);
    const text = messageBody.trim();

    // 2. Ensure User Exists in DB (Auto-Register Customer)
    let user = await prisma.user.findUnique({ where: { email: `${phoneNumber}@whatsapp.com` } });
    
    if (!user) {
      // Create a "Ghost" user for this phone number
      user = await prisma.user.create({
        data: {
          name: pushName,
          email: `${phoneNumber}@whatsapp.com`, // Dummy email
          role: "CUSTOMER",
          password: "", // No password needed for bot users
        }
      });
    }

    // 3. Get Current State
    let state = await getUserState(phoneNumber);

    // 4. Global Commands (Always work)
    if (text.toLowerCase() === "hi" || text.toLowerCase() === "menu" || text.toLowerCase() === "start") {
      await clearSession(phoneNumber);
      state = BotState.START;
      await setUserState(phoneNumber, BotState.START);
    }

    // 5. Route to Handler
    let response;

    switch (state) {
      case BotState.START:
        response = await handleMainMenu(phoneNumber, text, user);
        break;
        
      case BotState.BROWSING_CATEGORIES:
      case BotState.BROWSING_PRODUCTS:
      case BotState.PRODUCT_DETAIL:
        response = await handleCatalog(phoneNumber, text, state, user);
        break;

      case BotState.VIEWING_CART:
      case BotState.AWAITING_QUANTITY:
        response = await handleCart(phoneNumber, text, state, user);
        break;

      // case BotState.CHECKOUT_CONFIRM:
      //   response = await handleCheckout(phoneNumber, text, state, user);
      //   break;

      default:
        // Fallback to menu
        await setUserState(phoneNumber, BotState.START);
        response = await handleMainMenu(phoneNumber, text, user);
    }

    // 6. Return Response to Provider
    return c.json({ 
        success: true, 
        reply: response 
    });

  } catch (error) {
    return serverError(c, error);
  }
};