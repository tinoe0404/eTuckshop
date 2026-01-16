// src/services/whatsapp.service.ts

import type { MetaSendMessageResponse, MetaErrorResponse } from "../chatbot/types";

// ==============================
// ENVIRONMENT VARIABLES
// ==============================
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v18.0";

// ==============================
// SEND TEXT MESSAGE
// ==============================

/**
 * Sends a text message to a WhatsApp user via Meta Cloud API
 * @param to - Recipient phone number (e.g., "263771234567")
 * @param text - Message text content
 * @returns Message ID if successful, null if failed
 */
export async function sendTextMessage(to: string, text: string): Promise<string | null> {
    // Validate environment variables
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.error("❌ WhatsApp API credentials not configured");
        console.error("Missing: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID");
        return null;
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
            preview_url: false, // Set to true if message contains URLs
            body: text,
        },
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const error = data as MetaErrorResponse;
            console.error("❌ WhatsApp API Error:", {
                status: response.status,
                code: error.error?.code,
                message: error.error?.message,
                details: error.error?.error_data?.details,
                trace: error.error?.fbtrace_id,
            });
            return null;
        }

        const result = data as MetaSendMessageResponse;
        const messageId = result.messages?.[0]?.id;

        if (messageId) {
            console.log(`✅ Message sent to ${to} (ID: ${messageId})`);
            return messageId;
        }

        return null;
    } catch (error) {
        console.error("❌ Failed to send WhatsApp message:", error);
        return null;
    }
}

// ==============================
// SEND MESSAGE WITH BUTTONS (Future Enhancement)
// ==============================

/**
 * Sends an interactive button message
 * @param to - Recipient phone number
 * @param bodyText - Message body text
 * @param buttons - Array of button objects (max 3)
 */
export async function sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
): Promise<string | null> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.error("❌ WhatsApp API credentials not configured");
        return null;
    }

    // Validate button count
    if (buttons.length === 0 || buttons.length > 3) {
        console.error("❌ Button count must be between 1 and 3");
        return null;
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: bodyText,
            },
            action: {
                buttons: buttons.map((btn) => ({
                    type: "reply",
                    reply: {
                        id: btn.id,
                        title: btn.title.substring(0, 20), // Max 20 chars
                    },
                })),
            },
        },
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const error = data as MetaErrorResponse;
            console.error("❌ WhatsApp Button API Error:", error.error?.message);
            return null;
        }

        const result = data as MetaSendMessageResponse;
        return result.messages?.[0]?.id || null;
    } catch (error) {
        console.error("❌ Failed to send button message:", error);
        return null;
    }
}

// ==============================
// WEBHOOK SIGNATURE VERIFICATION (Security)
// ==============================

/**
 * Verifies the signature of incoming webhook requests from Meta
 * @param signature - X-Hub-Signature-256 header value
 * @param body - Raw request body as string
 * @returns True if signature is valid
 */
export async function verifyWebhookSignature(signature: string, body: string): Promise<boolean> {
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
        console.warn("⚠️ WHATSAPP_APP_SECRET not set - signature verification disabled");
        return true; // Allow in development
    }

    try {
        // Remove 'sha256=' prefix
        const signatureHash = signature.replace("sha256=", "");

        // Generate expected signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(appSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

        // Convert to hex string
        const expectedSignature = Array.from(new Uint8Array(signatureBytes))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        return signatureHash === expectedSignature;
    } catch (error) {
        console.error("❌ Signature verification error:", error);
        return false;
    }
}

// ==============================
// MARK MESSAGE AS READ (Optional)
// ==============================

/**
 * Marks a message as read (shows blue checkmarks to sender)
 * @param messageId - The wamid of the message to mark as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        return false;
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                status: "read",
                message_id: messageId,
            }),
        });

        return response.ok;
    } catch (error) {
        console.error("❌ Failed to mark message as read:", error);
        return false;
    }
}
