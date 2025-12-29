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


// Helper function (Put this in utils or same file)
const calculateCartTotals = (cart: any) => {
  if (!cart) return { items: [], totalItems: 0, totalAmount: 0 };

  const items = cart.items.map((item: any) => {
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.product.price), // Ensure number
      stock: item.product.stock,
      stockLevel: item.product.stock > 10 ? 'High' : item.product.stock > 0 ? 'Low' : 'Out',
      subtotal: item.quantity * Number(item.product.price),
      product: item.product, // Pass the full product details to frontend
    };
  });

  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    totalItems,
    totalAmount,
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
    const { productId: pidRaw, quantity: qtyRaw } = await c.req.json();

    // specific parsing to ensure numbers
    const productId = parseInt(pidRaw);
    const quantity = parseInt(qtyRaw || 1);

    if (!productId || quantity < 1) {
      return c.json({ success: false, message: "Invalid input" }, 400);
    }

    // 🚀 OPTIMIZATION 1: Run independent queries in parallel
    // We fetch the Product (to check stock) and the User's Cart (to check existing items) simultaneously.
    const [product, existingCart] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.cart.findFirst({
        where: { userId: user.id },
        include: { items: true } // Fetch items now to avoid a separate DB call later
      })
    ]);

    // --- Validation Checks ---
    if (!product) return c.json({ success: false, message: "Product not found" }, 404);

    if (product.stock < quantity) {
      return c.json({ success: false, message: `Insufficient stock. Only ${product.stock} available` }, 400);
    }

    // --- Handle Cart Logic ---
    let cartId = existingCart?.id;

    // If no cart exists, create one
    if (!existingCart) {
      const newCart = await prisma.cart.create({
        data: { userId: user.id }
      });
      cartId = newCart.id;
    }

    // 🚀 OPTIMIZATION 2: Check for existing item in memory
    // We already fetched 'existingCart.items', so we don't need 'prisma.cartItem.findFirst'
    const currentItem = existingCart?.items.find((item) => item.productId === productId);

    if (currentItem) {
      // Check total stock requirement
      if (product.stock < currentItem.quantity + quantity) {
        return c.json({ success: false, message: "Insufficient stock for total quantity" }, 400);
      }

      // Update existing item
      await prisma.cartItem.update({
        where: { id: currentItem.id },
        data: { quantity: currentItem.quantity + quantity },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId: cartId!,
          productId: productId,
          quantity: quantity,
        },
      });
    }

    // 🔄 Invalidate Cache (Fire and forget - don't await if you want max speed, 
    // or keep await if consistency is critical. Usually safe to not await for cache del)
    invalidateCartCache(user.id); 

    // 🚀 OPTIMIZATION 3: Single Efficient Fetch for Response
    // We fetch everything needed for the frontend in ONE query using 'include'.
    // This replaces 'getOrCreateCartDB' which was likely causing the slowdowns.
    const finalCart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }, // Keep order consistent
          include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    category: { select: { name: true } } // Fetch category name if needed
                }
            }
          },
        },
      },
    });

    if (!finalCart) throw new Error("Cart creation failed");

    // Recalculate totals based on the fresh data
    const responseData = calculateCartTotals(finalCart);

    return c.json({
      success: true,
      message: "Product added to cart",
      data: responseData,
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