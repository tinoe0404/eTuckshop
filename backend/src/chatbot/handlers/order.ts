import { prisma } from "../../utils/prisma";
import { setUserState } from "../state";
import { BotState } from "../types";
import { generatePaynowLink } from "../../utils/paynow";
import { cache } from "../../utils/redis";

export const handleCheckout = async (phone: string, paymentMethod: "PAYNOW" | "CASH", user: any) => {
  try {
    // 1. Fetch Cart
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      await setUserState(phone, BotState.START);
      return "⚠️ Cart is empty.";
    }

    // 2. Validate Stock & Calculate Total
    let totalAmount = 0;
    
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        // Abort if out of stock
        return `⚠️ Stock Error: *${item.product.name}* only has ${item.product.stock} items left.\n\nPlease clear cart and re-add available quantity.`;
      }
      totalAmount += Number(item.product.price) * item.quantity;
    }

    // 3. Create Order (Transaction)
    const order = await prisma.$transaction(async (tx) => {
      // Create Order Header
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          totalAmount: totalAmount,
          status: "PENDING",
          paymentType: paymentMethod,
          orderItems: {
            create: cart.items.map(i => ({
              productId: i.productId,
              productName: i.product.name,
              quantity: i.quantity,
              priceAtPurchase: i.product.price,
              subtotal: Number(i.product.price) * i.quantity
            }))
          }
        }
      });

      // Clear Cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // 4. Invalidate Admin & User Caches
    // Note: We use a safe check here in case cache helper functions aren't fully typed yet
    if (cache) {
      await Promise.all([
        cache.del(`cart:${user.id}`),         // Clear User Cart
        cache.del(`cart:summary:${user.id}`), // Clear Badge
        // If you haven't implemented specific invalidation helpers yet, these are placeholders:
        // cache.invalidateOrders(order.id, user.id), 
        // cache.invalidateProducts()            
      ]);
    }

    // 5. Generate Response based on Payment Method
    await setUserState(phone, BotState.START);

    if (paymentMethod === "PAYNOW") {
      const link = await generatePaynowLink(user.email || "guest@whatsapp.com", totalAmount, order.orderNumber);
      
      if (!link) {
        return "✅ *Order Created!*\n⚠️ Error generating payment link. Please ask support.";
      }

      // Save the Paynow Ref for callback validation
      await prisma.paymentQR.create({
        data: {
          orderId: order.id,
          paymentType: "PAYNOW",
          qrData: link, 
          qrCode: link, // 👈 ADDED: Using the link as placeholder to satisfy schema requirement
        }
      });

      return `✅ *Order Placed!* (Ref: ${order.orderNumber})
      
💰 *Amount:* $${totalAmount.toFixed(2)}

👇 *Tap below to Pay Now:*
${link}

_You will receive a confirmation once paid._`;
    } 
    
    else {
      // CASH
      return `✅ *Order Placed!* (Ref: ${order.orderNumber})
      
💰 *Amount:* $${totalAmount.toFixed(2)}
📍 *Status:* Pending Payment

_Please visit our store to pay and collect your items._`;
    }

  } catch (error) {
    console.error("Checkout Error:", error);
    return "⚠️ An error occurred while processing your order. Please try again.";
  }
};