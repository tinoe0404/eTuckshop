import { prisma } from "../../utils/prisma";
import { setUserState, clearSession } from "../state";
import { BotState } from "../types";
import { formatPrice } from "../messageUtils";
import { handleCheckout } from "./order";
import { cache } from "../../utils/redis";

export const handleCart = async (phone: string, text: string, state: BotState, user: any) => {
  const cleanText = text.trim().toLowerCase();

  // ====================================================
  // STEP 1: DISPLAY CART
  // ====================================================
  // If we just arrived here or user typed "cart"
  if (state === BotState.VIEWING_CART && (!text || cleanText === "cart")) {
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      await setUserState(phone, BotState.START);
      return "🛒 *Your Cart is Empty.*\n\nReply *1* to browse products.";
    }

    let msg = "*🛒 Your Cart:*\n\n";
    let total = 0;

    cart.items.forEach((item, i) => {
      const sub = Number(item.product.price) * item.quantity;
      total += sub;
      msg += `${i + 1}. ${item.product.name} (x${item.quantity})\n   └ ${formatPrice(sub)}\n`;
    });

    msg += `\n*Total: ${formatPrice(total)}*\n`;
    msg += `------------------------------\n`;
    msg += `1️⃣ *Pay with Paynow* (Ecocash/OneMoney)\n`;
    msg += `2️⃣ *Pay with Cash* (Collection)\n`;
    msg += `3️⃣ Clear Cart\n`;
    msg += `0️⃣ Main Menu\n`;
    
    // Move state to confirmation
    await setUserState(phone, BotState.CHECKOUT_CONFIRM);
    return msg;
  }

  // ====================================================
  // STEP 2: HANDLE SELECTION
  // ====================================================
  if (state === BotState.CHECKOUT_CONFIRM) {
    
    // --- PAYNOW CHECKOUT ---
    if (cleanText === "1") {
      return await handleCheckout(phone, "PAYNOW", user);
    }

    // --- CASH CHECKOUT ---
    if (cleanText === "2") {
      return await handleCheckout(phone, "CASH", user);
    }

    // --- CLEAR CART ---
    if (cleanText === "3") {
      const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        // Invalidate Cache
        await Promise.all([
           cache.del(`cart:${user.id}`),
           cache.del(`cart:summary:${user.id}`)
        ]);
      }
      await setUserState(phone, BotState.START);
      return "🗑️ *Cart Cleared.*\n\nReply *1* to start shopping.";
    }

    // --- BACK TO MENU ---
    if (cleanText === "0") {
      await setUserState(phone, BotState.START);
      return "👋 *Main Menu*";
    }

    return "⚠️ Invalid option. Reply 1, 2, 3 or 0.";
  }

  return "⚠️ Unknown Error";
};