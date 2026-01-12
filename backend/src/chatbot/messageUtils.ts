// src/chatbot/messageUtils.ts

// Standardize phone number to save in DB (e.g., remove +)
export const formatPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, ''); // Removes +, spaces, dashes
  };
  
  export const formatPrice = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };
  
  export const createListMessage = (title: string, items: string[]) => {
    let msg = `*${title}*\n\n`;
    items.forEach((item, index) => {
      msg += `${index + 1}. ${item}\n`;
    });
    msg += `\n_Reply with the number to select_`;
    return msg;
  };
  
  // WhatsApp Webhook Response Helper
  // This format is required if you are using Twilio or Meta Cloud API directly.
  // For now, I'll assume we return a JSON object that your provider adapter sends.
  export const textResponse = (body: string) => {
      return { type: 'text', body };
  };