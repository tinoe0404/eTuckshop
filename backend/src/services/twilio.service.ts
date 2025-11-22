import Twilio from "twilio";

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

// Send WhatsApp message
export const sendWhatsAppMessage = async (to: string, message: string) => {
  try {
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    
    const response = await client.messages.create({
      from: WHATSAPP_NUMBER,
      to: formattedTo,
      body: message,
    });
    
    console.log(`📤 Message sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:", error);
    throw error;
  }
};

// Send WhatsApp message with media (for QR codes)
export const sendWhatsAppMedia = async (to: string, message: string, mediaUrl: string) => {
  try {
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    
    const response = await client.messages.create({
      from: WHATSAPP_NUMBER,
      to: formattedTo,
      body: message,
      mediaUrl: [mediaUrl],
    });
    
    console.log(`📤 Media sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send WhatsApp media:", error);
    throw error;
  }
};

// Validate Twilio webhook signature
export const validateTwilioSignature = (
  signature: string,
  url: string,
  params: Record<string, string>
): boolean => {
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  return Twilio.validateRequest(authToken, signature, url, params);
};