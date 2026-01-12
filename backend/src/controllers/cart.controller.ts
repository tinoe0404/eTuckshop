// src/controllers/cart.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";
import { cache, getOrSetCache } from "../utils/redis";

const CART_TTL = 60 * 60; // 1 Hour

// Helper function (Put this in utils or same file)
const calculateCartTotals = (cart: any) => {
  if (!cart?.items) return { items: [], totalItems: 0, totalAmount: 0 };

  const items = cart.items.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: item.product.price,
    subtotal: item.quantity * item.product.price,
    product: item.product, // Contains nested category from the include above
    stock: item.product.stock,
    stockLevel: item.product.stock > 10 ? 'In Stock' : 'Low Stock'
  }));

  const totalItems = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

  return { items, totalItems, totalAmount };
};

// ==============================
// HELPER: INVALIDATE CACHE
// ==============================
const invalidateCartCache = async (userId: number) => {
  await Promise.all([
    cache.del(`cart:${userId}`),
    cache.del(`cart:summary:${userId}`),
  ]);
};

// Helper: Fetch Cart with all relations in ONE query
const getOrCreateCartDB = async (userId: number) => {
  return await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true // Only keep this if you display category name in the cart
            }
          }
        }
      }
    }
  });
};

// Optimized getCart
export const getCart = async (c: Context) => {
  try {
    const user = c.get('user');

    const cartData = await getOrSetCache(`cart:${user.id}`, async () => {
      // This now executes as one optimized batch query
      const cart = await getOrCreateCartDB(user.id);

      // Ensure calculateCartTotals doesn't perform ANY extra DB queries
      return calculateCartTotals(cart);
    }, CART_TTL);

    return c.json({
      success: true,
      message: "Cart retrieved successfully",
      data: cartData || { items: [], totalItems: 0, totalAmount: 0 },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// ADD TO CART
// ==============================
// ==============================
// ADD TO CART
// ==============================
export const addToCart = async (c: Context) => {
  try {
    const user = c.get('user');
    const { productId: pidRaw, quantity: qtyRaw } = await c.req.json();

    const productId = parseInt(pidRaw);
    const quantity = parseInt(qtyRaw || 1);

    if (!productId || quantity < 1) {
      return c.json({ success: false, message: "Invalid input" }, 400);
    }

    // 1. Fetch Product & Cart in parallel
    const [product, existingCart] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.cart.findFirst({
        where: { userId: user.id },
        include: { items: true }
      })
    ]);

    if (!product) return c.json({ success: false, message: "Product not found" }, 404);
    if (product.stock < quantity) {
      return c.json({ success: false, message: `Insufficient stock.` }, 400);
    }

    let cartId = existingCart?.id;

    // 2. Create Cart if needed
    if (!existingCart) {
      const newCart = await prisma.cart.create({ data: { userId: user.id } });
      cartId = newCart.id;
    }

    // 3. Upsert Logic
    const currentItem = existingCart?.items.find((item) => item.productId === productId);

    if (currentItem) {
      if (product.stock < currentItem.quantity + quantity) {
        return c.json({ success: false, message: "Insufficient stock" }, 400);
      }
      await prisma.cartItem.update({
        where: { id: currentItem.id },
        data: { quantity: currentItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cartId!,
          productId,
          quantity,
        },
      });
    }

    // 4. Invalidate Cache
    invalidateCartCache(user.id);

    // 5. Optimized Response Fetch
    // We only need to fetch the Updated Cart items to calculate totals
    const finalCart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { include: { category: true } } // needed for UI
          }
        }
      }
    });

    return c.json({
      success: true,
      message: "Added to cart",
      data: calculateCartTotals(finalCart),
    });

  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// UPDATE CART ITEM
// ==============================
export const updateCartItem = async (c: Context) => {
  try {
    const user = c.get('user');
    const { productId, quantity } = await c.req.json();

    if (!productId || quantity < 1) return c.json({ success: false, message: "Invalid input" }, 400);

    const cart = await getOrCreateCartDB(user.id);
    const cartItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: parseInt(productId) },
      include: { product: true }
    });

    if (!cartItem) return c.json({ success: false, message: "Item not found in cart" }, 404);
    if (cartItem.product.stock < quantity) {
      return c.json({ success: false, message: `Insufficient stock. Only ${cartItem.product.stock} available` }, 400);
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: parseInt(quantity) }
    });

    // 🔄 Invalidate Cache
    await invalidateCartCache(user.id);

    const updatedCart = await getOrCreateCartDB(user.id);
    return c.json({
      success: true,
      message: "Cart updated",
      data: calculateCartTotals(updatedCart),
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// REMOVE FROM CART
// ==============================
export const removeFromCart = async (c: Context) => {
  try {
    const user = c.get('user');
    const productId = Number(c.req.param("productId"));

    const cart = await getOrCreateCartDB(user.id);
    const cartItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId }
    });

    if (!cartItem) return c.json({ success: false, message: "Item not found" }, 404);

    await prisma.cartItem.delete({ where: { id: cartItem.id } });

    // 🔄 Invalidate Cache
    await invalidateCartCache(user.id);

    const updatedCart = await getOrCreateCartDB(user.id);
    return c.json({
      success: true,
      message: "Item removed",
      data: calculateCartTotals(updatedCart),
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// CLEAR CART
// ==============================
export const clearCart = async (c: Context) => {
  try {
    const user = c.get('user');
    const cart = await getOrCreateCartDB(user.id);

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // 🔄 Invalidate Cache
    await invalidateCartCache(user.id);

    return c.json({
      success: true,
      message: "Cart cleared",
      data: { ...cart, items: [], totalItems: 0, totalAmount: 0 },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET CART SUMMARY (Super Fast - Cached)
// ==============================
export const getCartSummaryGet = async (c: Context) => {
  try {
    const user = c.get('user');

    // ✅ CACHE FIRST with 5-minute TTL
    const summary = await getOrSetCache(`cart:summary:${user.id}`, async () => {
      // Ultra-minimal query - only get counts and prices
      const cart = await prisma.cart.findUnique({
        where: { userId: user.id },
        select: {
          items: {
            select: {
              quantity: true,
              productId: true,
              product: { select: { price: true } }
            }
          }
        }
      });

      if (!cart || !cart.items.length) {
        return { totalItems: 0, totalAmount: 0 };
      }

      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + (item.quantity * Number(item.product.price));
      }, 0);

      return { totalItems, totalAmount };
    }, 300); // 5-minute cache

    return c.json({ success: true, data: summary });
  } catch (error) {
    // Fallback to empty cart on error
    return c.json({ success: true, data: { totalItems: 0, totalAmount: 0 } });
  }
};

// Legacy Post Method
export const getCartSummary = async (c: Context) => getCartSummaryGet(c);