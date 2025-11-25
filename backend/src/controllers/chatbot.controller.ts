import { Context } from "hono";
import { handleIncomingMessage, generatePayNowQRAfterPayment } from "../services/chatbot.service";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "../services/twilio.service";
import { serverError } from "../utils/serverError";
import { prisma } from "../utils/db";

// ==========================================
// TWILIO WEBHOOK - RECEIVE MESSAGES
// ==========================================
export const twilioWebhook = async (c: Context) => {
  try {
    // Parse Twilio webhook data
    const body = await c.req.parseBody();
    
    const from = body.From as string;        // e.g., "whatsapp:+1234567890"
    const message = body.Body as string;     // The message content
    const messageSid = body.MessageSid as string;

    console.log(`📩 Incoming message from ${from}: ${message}`);

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = from.replace("whatsapp:", "");

    // Process message through chatbot
    const response = await handleIncomingMessage(phoneNumber, message);

    // Check if response is a special JSON (for QR code)
    if (response.startsWith("{")) {
      try {
        const data = JSON.parse(response);
        
        if (data.type === "CASH_ORDER") {
          // Send order confirmation message
          await sendWhatsAppMessage(from, data.message);
          
          // Send QR code as image
          // For QR code, we need to host it or send as base64
          // Twilio requires a public URL for media
          // Option 1: Save QR to file and host
          // Option 2: Use a service to convert base64 to URL
          // For now, send the QR data as text (customer can screenshot)
          await sendWhatsAppMessage(from, data.qrMessage + "\n\n_QR Code has been generated. Check your order in the app to view it._");
          
          return c.text("OK");
        }
      } catch (e) {
        // Not JSON, send as regular message
      }
    }

    // Send response back via Twilio
    await sendWhatsAppMessage(from, response);

    // Return empty TwiML response
    return c.text("OK");

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return serverError(c, error);
  }
};

// ==========================================
// TWILIO WEBHOOK - STATUS CALLBACK
// ==========================================
export const twilioStatusCallback = async (c: Context) => {
    try {
      const body = await c.req.parseBody();
      
      const messageSid = body.MessageSid as string;
      const status = body.MessageStatus as string;
      
      console.log(`📊 Message ${messageSid} status: ${status}`);
  
      return c.text("OK");
    } catch (error) {
      console.error("❌ Status callback error:", error);
      return c.text("OK");
    }
  };

// ==========================================
// PAYNOW PAYMENT SUCCESS - SEND QR TO CUSTOMER
// ==========================================
export const handlePayNowSuccess = async (c: Context) => {
    try {
      const orderId = Number(c.req.param("orderId"));
      const ref = c.req.query("ref");
  
      // Verify payment ref
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { paymentQR: true, user: true },
      });
  
      if (!order || order.paymentQR?.qrData !== ref) {
        return c.json({ success: false, message: "Invalid payment reference" }, 400);
      }
  
      if (order.status === "PAID") {
        return c.json({ success: false, message: "Order already paid" }, 400);
      }
  
      // Generate QR after payment
      const result = await generatePayNowQRAfterPayment(orderId);
  
      if (!result) {
        return c.json({ success: false, message: "Failed to generate QR" }, 500);
      }
  
      // TODO: Send QR to customer via WhatsApp
      // You need to store customer's phone number with their user record
      // const phoneNumber = order.user.phoneNumber;
      // await sendWhatsAppMessage(`whatsapp:${phoneNumber}`, result.message);
  
      return c.json({
        success: true,
        message: "Payment successful! QR code generated.",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          qrCode: result.qrCode,
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

  // ==========================================
  // SEND MESSAGE TO CUSTOMER (Utility)
  // ==========================================
  export const sendMessageToCustomer = async (c: Context) => {
    try {
      const { phoneNumber, message } = await c.req.json();
  
      if (!phoneNumber || !message) {
        return c.json({ success: false, message: "Phone number and message required" }, 400);
      }
  
      await sendWhatsAppMessage(`whatsapp:${phoneNumber}`, message);
  
      return c.json({ success: true, message: "Message sent" });
    } catch (error) {
      return serverError(c, error);
    }
  };