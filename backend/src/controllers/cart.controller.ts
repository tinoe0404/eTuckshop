// src/controllers/cart.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";
import { cache, getOrSetCache } from "../utils/redis";

const CART_TTL = 60 * 60; // 1 Hour

// ==============================
// HELPER: GET OR CREATE CART (DB)
// ==============================
const getOrCreateCartDB = async (userId: number) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });
  }
  return cart;
};

// ==============================
// HELPER: CALCULATE TOTALS
// ==============================
const calculateCartTotals = (cart: any) => {
  const items = cart.items.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    description: item.product.description,
    price: item.product.price,
    quantity: item.quantity,
    subtotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
    stock: item.product.stock,
    stockLevel: getStockLevel(item.product.stock),
    category: item.product.category,
    image: item.product.image || null,
  }));

  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalAmount = parseFloat(
    items.reduce((sum: number, item: any) => sum + item.subtotal, 0).toFixed(2)
  );

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    totalItems,
    totalAmount,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
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

// ==============================
// GET CART (Cached)
// ==============================
export const getCart = async (c: Context) => {
  try {
    const user = c.get('user');
    
    // Cache Key: cart:123
    const cartData = await getOrSetCache(`cart:${user.id}`, async () => {
        const cart = await getOrCreateCartDB(user.id);
        return calculateCartTotals(cart);
    }, CART_TTL);

    return c.json({
      success: true,
      message: "Cart retrieved successfully",
      data: cartData,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// ADD TO CART
// ==============================
export const addToCart = async (c: Context) => {
  try {
    const user = c.get('user');
    const { productId, quantity = 1 } = await c.req.json();

    if (!productId || quantity < 1) return c.json({ success: false, message: "Invalid input" }, 400);

    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
    if (!product) return c.json({ success: false, message: "Product not found" }, 404);

    if (product.stock < quantity) {
        return c.json({ success: false, message: `Insufficient stock. Only ${product.stock} available` }, 400);
    }

    const cart = await getOrCreateCartDB(user.id);
    const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: parseInt(productId) }
    });

    if (existingItem) {
        if (product.stock < existingItem.quantity + quantity) {
            return c.json({ success: false, message: "Insufficient stock for total quantity" }, 400);
        }
        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity }
        });
    } else {
        await prisma.cartItem.create({
            data: { cartId: cart.id, productId: parseInt(productId), quantity: parseInt(quantity) }
        });
    }

    // 🔄 Invalidate Cache
    await invalidateCartCache(user.id);

    // Return fresh data (skipping cache for the response)
    const updatedCart = await getOrCreateCartDB(user.id);
    return c.json({
      success: true,
      message: "Product added to cart",
      data: calculateCartTotals(updatedCart),
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
// GET CART SUMMARY (Cached)
// ==============================
export const getCartSummaryGet = async (c: Context) => {
  try {
    const user = c.get('user');

    // Cache Key: cart:summary:123
    // Smaller payload, faster to fetch than full cart
    const summary = await getOrSetCache(`cart:summary:${user.id}`, async () => {
        const cart = await getOrCreateCartDB(user.id);
        const cartWithTotals = calculateCartTotals(cart);
        return {
            totalItems: cartWithTotals.totalItems,
            totalAmount: cartWithTotals.totalAmount
        };
    }, CART_TTL);

    return c.json({ success: true, data: summary });
  } catch (error) {
    return serverError(c, error);
  }
};

// Legacy Post Method
export const getCartSummary = async (c: Context) => getCartSummaryGet(c);