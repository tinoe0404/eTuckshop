// src/chatbot/handlers/catalog.ts
import { prisma } from "../../utils/prisma";
import { setUserState, getSessionData, updateSessionData } from "../state";
import { BotState } from "../types";
import { formatPrice } from "../messageUtils";
import { deleteCache } from "../../utils/cache"; // 👈 Use the helper from your utils

export const handleCatalog = async (
  phone: string, 
  text: string, 
  state: BotState, 
  user: any
): Promise<string> => { // 👈 Explicit return type
  
  const session = await getSessionData(phone);

  // ====================================================
  // STEP 1: SHOW CATEGORIES
  // ====================================================
  if (state === BotState.BROWSING_CATEGORIES) {
    // A. Display List
    if (!text) {
      const categories = await prisma.category.findMany({
        take: 10,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } }
      });

      if (categories.length === 0) return "⚠️ No categories found.";

      const mapping: Record<string, number> = {};
      let msg = "*📂 Select a Category:*\n\n";
      
      categories.forEach((c, index) => {
        const key = (index + 1).toString();
        mapping[key] = c.id;
        msg += `*${key}.* ${c.name} (${c._count.products})\n`;
      });

      await updateSessionData(phone, { listMapping: mapping });
      
      return msg;
    }

    // B. Handle Selection
    const selectedId = session.listMapping?.[text];
    if (!selectedId) {
      return "⚠️ Invalid selection. Please reply with the number next to the category.";
    }

    // Transition to Products
    await updateSessionData(phone, { currentCategoryId: selectedId });
    await setUserState(phone, BotState.BROWSING_PRODUCTS);
    
    // Recursive call
    return await handleCatalog(phone, "", BotState.BROWSING_PRODUCTS, user);
  }

  // ====================================================
  // STEP 2: SHOW PRODUCTS
  // ====================================================
  if (state === BotState.BROWSING_PRODUCTS) {
    // A. Display List
    if (!text) {
      const products = await prisma.product.findMany({
        where: { 
          categoryId: session.currentCategoryId,
          stock: { gt: 0 } 
        },
        take: 10
      });

      if (products.length === 0) {
        await setUserState(phone, BotState.BROWSING_CATEGORIES);
        return "⚠️ No items in this category. Reply *0* to go back.";
      }

      const mapping: Record<string, number> = {};
      let msg = "*📦 Select a Product:*\n\n";

      products.forEach((p, index) => {
        const key = (index + 1).toString();
        mapping[key] = p.id;
        msg += `*${key}.* ${p.name}\n   └ ${formatPrice(Number(p.price))}\n`;
      });

      msg += "\n_Reply *0* to go back_";

      await updateSessionData(phone, { listMapping: mapping });
      return msg;
    }

    // B. Handle Go Back
    if (text === "0") {
      await setUserState(phone, BotState.BROWSING_CATEGORIES);
      return await handleCatalog(phone, "", BotState.BROWSING_CATEGORIES, user);
    }

    // C. Handle Selection
    const selectedId = session.listMapping?.[text];
    if (!selectedId) return "⚠️ Invalid selection.";

    await updateSessionData(phone, { currentProductId: selectedId });
    await setUserState(phone, BotState.PRODUCT_DETAIL);
    
    return await handleCatalog(phone, "", BotState.PRODUCT_DETAIL, user);
  }

  // ====================================================
  // STEP 3: PRODUCT DETAIL & QUANTITY
  // ====================================================
  if (state === BotState.PRODUCT_DETAIL) {
    // A. Display Details
    if (!text) {
      const product = await prisma.product.findUnique({ where: { id: session.currentProductId } });
      if (!product) return "⚠️ Product not found.";

      await updateSessionData(phone, { maxStock: product.stock });

      return `*${product.name}*
💰 Price: ${formatPrice(Number(product.price))}
📦 Stock: ${product.stock} available

${product.description || "No description."}

------------------------------
*🔢 Reply with the QUANTITY you want (e.g., 1 or 2).*
_Reply *0* to go back._`;
    }

    // B. Handle Go Back
    if (text === "0") {
      await setUserState(phone, BotState.BROWSING_PRODUCTS);
      return await handleCatalog(phone, "", BotState.BROWSING_PRODUCTS, user);
    }

    // C. Handle Quantity Input
    const qty = parseInt(text);
    
    if (isNaN(qty) || qty < 1) return "⚠️ Please enter a valid number (e.g., 1).";
    if (qty > (session.maxStock || 0)) return `⚠️ Not enough stock. Max available: ${session.maxStock}`;

    // --- DB ACTION: ADD TO CART ---
    
    // 1. Get/Create Cart
    // ⚠️ FIXED: Added explicit updatedAt to update block to avoid type error
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: { updatedAt: new Date() } 
    });

    // 2. Add Item
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: session.currentProductId!
        }
      },
      update: { quantity: { increment: qty } },
      create: {
        cartId: cart.id,
        productId: session.currentProductId!,
        quantity: qty
      }
    });

    // 3. Invalidate Cache
    // ⚠️ FIXED: Using deleteCache(string) helper instead of generic cache object
    await Promise.all([
      deleteCache(`cart:${user.id}`),
      deleteCache(`cart:summary:${user.id}`)
    ]);

    // 4. Success
    await setUserState(phone, BotState.START);
    
    return `✅ *Added to Cart!*
    
What would you like to do next?
1️⃣ Browse More
2️⃣ View Cart & Checkout
3️⃣ Track Order`;
  }

  return "⚠️ Error: Unknown State.";
};