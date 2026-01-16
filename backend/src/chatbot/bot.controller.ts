// src/chatbot/bot.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { getUserState, setUserState, clearSession, isMessageProcessed, markMessageProcessed } from "./state";
import { BotState, MetaWebhookPayload } from "./types";
import { formatPhoneNumber } from "./messageUtils";
import { sendTextMessage } from "../services/whatsapp.service";

// Import Handlers
import { handleMainMenu } from "./handlers/menu";
import { handleCatalog } from "./handlers/catalog";
import { handleCart } from "./handlers/cart";

// ==============================
// WEBHOOK VERIFICATION (GET)
// ==============================

/**
 * Handles Meta's webhook verification challenge
 * Called when you set up the webhook URL in Meta App Dashboard
 */
export const handleWebhookVerification = async (c: Context) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  console.log("🔐 Webhook verification attempt:", { mode, token: token ? "***" : "missing" });

  // Verify the mode and token
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    // IMPORTANT: Return challenge as plain text (NOT JSON)
    return c.text(challenge || '');
  }

  console.warn("❌ Webhook verification failed");
  return c.text('Forbidden', 403);
};

// ==============================
// MESSAGE WEBHOOK (POST)
// ==============================

/**
 * Handles incoming WhatsApp messages from Meta Cloud API
 * Implements idempotency and async processing
 */
export const handleWebhookPost = async (c: Context) => {
  try {
    // 1. IMMEDIATELY return 200 OK (Meta requires response within 3 seconds)
    // We'll process the message asynchronously
    c.executionCtx?.waitUntil(processWebhookAsync(c));

    return c.text('OK', 200);
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    return c.text('OK', 200); // Still return OK to prevent Meta retries
  }
};

/**
 * Async message processing (runs after responding to Meta)
 */
async function processWebhookAsync(c: Context) {
  try {
    const body = await c.req.json();

    // Parse Meta Cloud API payload
    const webhook = body as MetaWebhookPayload;

    // Validate payload structure
    if (webhook.object !== "whatsapp_business_account") {
      console.log("⚠️ Ignoring non-WhatsApp webhook");
      return;
    }

    // Extract message from nested structure
    const entry = webhook.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || !message.text) {
      console.log("⚠️ No text message found in webhook");
      return;
    }

    // Extract message data
    const wamid = message.id; // WhatsApp Message ID (for idempotency)
    const rawPhone = message.from;
    const messageText = message.text.body;
    const senderName = value.contacts?.[0]?.profile?.name || "Guest";

    console.log(`📨 Received message from ${rawPhone}: "${messageText}"`);

    // 2. IDEMPOTENCY CHECK
    const alreadyProcessed = await isMessageProcessed(wamid);
    if (alreadyProcessed) {
      console.log(`⚠️ Duplicate message ignored (wamid: ${wamid})`);
      return;
    }

    // Mark as processed immediately
    await markMessageProcessed(wamid);

    // 3. Format phone number
    const phoneNumber = formatPhoneNumber(rawPhone);
    const text = messageText.trim();

    // 4. Ensure User Exists in DB (Auto-Register)
    let user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      // Try to find by email (legacy support)
      user = await prisma.user.findUnique({
        where: { email: `${phoneNumber}@whatsapp.com` }
      });

      if (user && !user.phoneNumber) {
        // Update existing user with phone number
        user = await prisma.user.update({
          where: { id: user.id },
          data: { phoneNumber }
        });
      }
    }

    if (!user) {
      // Create new WhatsApp user
      user = await prisma.user.create({
        data: {
          name: senderName,
          phoneNumber: phoneNumber,
          email: `${phoneNumber}@whatsapp.com`,
          role: "CUSTOMER",
          password: "", // No password for WhatsApp users
        }
      });
      console.log(`✅ Created new user: ${senderName} (${phoneNumber})`);
    }

    // 5. Get Current State
    let state = await getUserState(phoneNumber);

    // 6. Global Commands (Always work)
    if (text.toLowerCase() === "hi" || text.toLowerCase() === "menu" || text.toLowerCase() === "start") {
      await clearSession(phoneNumber);
      state = BotState.START;
      await setUserState(phoneNumber, BotState.START);
    }

    // 7. Route to Handler
    let responseText: string | undefined;

    switch (state) {
      case BotState.START:
        responseText = await handleMainMenu(phoneNumber, text, user);
        break;

      case BotState.BROWSING_CATEGORIES:
      case BotState.BROWSING_PRODUCTS:
      case BotState.PRODUCT_DETAIL:
        responseText = await handleCatalog(phoneNumber, text, state, user);
        break;

      case BotState.VIEWING_CART:
      case BotState.AWAITING_QUANTITY:
        responseText = await handleCart(phoneNumber, text, state, user);
        break;

      default:
        // Fallback to menu
        await setUserState(phoneNumber, BotState.START);
        responseText = await handleMainMenu(phoneNumber, text, user);
    }

    // 8. Send Response via Meta API
    if (responseText) {
      await sendTextMessage(phoneNumber, responseText);
    }

  } catch (error) {
    console.error("❌ Error processing webhook:", error);
  }
}

// ==============================
// LEGACY WEBHOOK (Backward Compatibility)
// ==============================

/**
 * Legacy webhook handler for non-Meta providers
 * Keep this for backward compatibility during transition
 */
export const webhook = async (c: Context) => {
  try {
    // 1. Parse Incoming Message
    const body = await c.req.json();

    // Check if it's Meta format
    if (body.object === "whatsapp_business_account") {
      // Redirect to new handler
      return handleWebhookPost(c);
    }

    // Legacy format
    const rawPhone = body.from || body.phone;
    const messageBody = body.text || body.body || "";
    const pushName = body.pushname || "Guest";

    if (!rawPhone || !messageBody) {
      return c.json({ status: "ignored", reason: "no_data" });
    }

    const phoneNumber = formatPhoneNumber(rawPhone);
    const text = messageBody.trim();

    // 2. Ensure User Exists in DB
    let user = await prisma.user.findUnique({ where: { email: `${phoneNumber}@whatsapp.com` } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: pushName,
          email: `${phoneNumber}@whatsapp.com`,
          role: "CUSTOMER",
          password: "",
        }
      });
    }

    // 3. Get Current State
    let state = await getUserState(phoneNumber);

    // 4. Global Commands
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

      default:
        await setUserState(phoneNumber, BotState.START);
        response = await handleMainMenu(phoneNumber, text, user);
    }

    // 6. Return Response (for legacy providers to send)
    return c.json({
      success: true,
      reply: response
    });

  } catch (error) {
    return serverError(c, error);
  }
};