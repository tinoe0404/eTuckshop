import { setUserState } from "../state";
import { BotState } from "../types";
import { handleCatalog } from "./catalog";
// import { handleCart } from "./cart"; // We will build this in Batch 3

export const handleMainMenu = async (phoneNumber: string, text: string, user: any) => {
  const cleanText = text.trim().toLowerCase();

  // --- OPTION 1: BROWSE ---
  if (cleanText === "1" || cleanText.includes("browse") || cleanText.includes("shop")) {
    await setUserState(phoneNumber, BotState.BROWSING_CATEGORIES);
    // 🚀 UX HACK: Call catalog immediately so they don't have to type again
    return await handleCatalog(phoneNumber, "", BotState.BROWSING_CATEGORIES, user);
  }

  // --- OPTION 2: VIEW CART ---
  if (cleanText === "2" || cleanText.includes("cart")) {
    await setUserState(phoneNumber, BotState.VIEWING_CART);
    return "🛒 *Opening Cart...* (Please wait for the next update)"; 
    // return await handleCart(phoneNumber, "", BotState.VIEWING_CART, user);
  }

  // --- OPTION 3: TRACK ORDER ---
  if (cleanText === "3" || cleanText.includes("track")) {
    return `🚚 *Track Order*
    
Please enter your *Order Number* (e.g., ORD-X7A-99).`;
  }

  // --- DEFAULT DISPLAY ---
  return `👋 *Welcome to the Store!*
  
How can I help you today?

1️⃣ Browse Products
2️⃣ View My Cart
3️⃣ Track Order

_Reply with the number (e.g., 1)_`;
};