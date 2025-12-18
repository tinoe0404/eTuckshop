// src/controllers/cart.controller.ts
// ✅ FIXED: Uses requireAuth middleware and c.get('user')

import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";

// ==============================
// HELPER: GET OR CREATE CART
// ==============================
const getOrCreateCart = async (userId: number) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
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
            product: {
              include: { category: true },
            },
          },
        },
      },
    });
  }

  return cart;
};

// ==============================
// HELPER: CALCULATE CART TOTALS
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
// GET CART (Protected - requireAuth)
// ==============================
export const getCart = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    console.log(`🛒 User ${user.email} (ID: ${user.id}) fetching cart`);

    const cart = await getOrCreateCart(user.id);
    const cartWithTotals = calculateCartTotals(cart);

    console.log(`✅ Cart retrieved: ${cartWithTotals.totalItems} items, $${cartWithTotals.totalAmount}`);

    return c.json({
      success: true,
      message: "Cart retrieved successfully",
      data: cartWithTotals,
    });
  } catch (error) {
    console.error('❌ Error fetching cart:', error);
    return serverError(c, error);
  }
};

// ==============================
// ADD TO CART (Protected - requireAuth)
// ==============================
export const addToCart = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    const { productId, quantity = 1 } = await c.req.json();

    console.log(`➕ User ${user.email} (ID: ${user.id}) adding product ${productId} (qty: ${quantity}) to cart`);

    // Validate input
    if (!productId || quantity < 1) {
      console.log('❌ Invalid product ID or quantity');
      return c.json(
        { success: false, message: "Invalid product ID or quantity" },
        400
      );
    }

    // Check if product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      console.log(`❌ Product ${productId} not found`);
      return c.json(
        { success: false, message: "Product not found" },
        404
      );
    }

    if (product.stock < quantity) {
      console.log(`❌ Insufficient stock for product ${productId}: requested ${quantity}, available ${product.stock}`);
      return c.json(
        {
          success: false,
          message: `Insufficient stock. Only ${product.stock} available`,
        },
        400
      );
    }

    // Get or create cart
    const cart = await getOrCreateCart(user.id);

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: parseInt(productId),
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + parseInt(quantity);

      if (product.stock < newQuantity) {
        console.log(`❌ Cannot add ${quantity} more - only ${product.stock - existingItem.quantity} available`);
        return c.json(
          {
            success: false,
            message: `Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} available`,
          },
          400
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });

      console.log(`✅ Updated cart item quantity: ${existingItem.quantity} → ${newQuantity}`);
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: parseInt(productId),
          quantity: parseInt(quantity),
        },
      });

      console.log(`✅ Added new item to cart: ${product.name} (qty: ${quantity})`);
    }

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    const cartWithTotals = calculateCartTotals(updatedCart);

    return c.json({
      success: true,
      message: "Product added to cart successfully",
      data: cartWithTotals,
    });
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    return serverError(c, error);
  }
};

// ==============================
// UPDATE CART ITEM (Protected - requireAuth)
// ==============================
export const updateCartItem = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    const { productId, quantity } = await c.req.json();

    console.log(`✏️ User ${user.email} (ID: ${user.id}) updating cart item ${productId} to qty ${quantity}`);

    if (!productId || quantity < 1) {
      console.log('❌ Invalid product ID or quantity');
      return c.json(
        { success: false, message: "Invalid product ID or quantity" },
        400
      );
    }

    const cart = await getOrCreateCart(user.id);

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: parseInt(productId),
      },
      include: { product: true },
    });

    if (!cartItem) {
      console.log(`❌ Item ${productId} not found in cart`);
      return c.json(
        { success: false, message: "Item not found in cart" },
        404
      );
    }

    // Check stock
    if (cartItem.product.stock < quantity) {
      console.log(`❌ Insufficient stock: requested ${quantity}, available ${cartItem.product.stock}`);
      return c.json(
        {
          success: false,
          message: `Insufficient stock. Only ${cartItem.product.stock} available`,
        },
        400
      );
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: parseInt(quantity) },
    });

    console.log(`✅ Cart item updated: ${cartItem.product.name} quantity ${cartItem.quantity} → ${quantity}`);

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    const cartWithTotals = calculateCartTotals(updatedCart);

    return c.json({
      success: true,
      message: "Cart updated successfully",
      data: cartWithTotals,
    });
  } catch (error) {
    console.error('❌ Error updating cart item:', error);
    return serverError(c, error);
  }
};

// ==============================
// REMOVE FROM CART (Protected - requireAuth)
// ==============================
export const removeFromCart = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    const productId = Number(c.req.param("productId"));

    console.log(`🗑️ User ${user.email} (ID: ${user.id}) removing product ${productId} from cart`);

    const cart = await getOrCreateCart(user.id);

    // Find and delete cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
      include: { product: true },
    });

    if (!cartItem) {
      console.log(`❌ Item ${productId} not found in cart`);
      return c.json(
        { success: false, message: "Item not found in cart" },
        404
      );
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    console.log(`✅ Removed from cart: ${cartItem.product.name}`);

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    const cartWithTotals = calculateCartTotals(updatedCart);

    return c.json({
      success: true,
      message: "Item removed from cart successfully",
      data: cartWithTotals,
    });
  } catch (error) {
    console.error('❌ Error removing from cart:', error);
    return serverError(c, error);
  }
};

// ==============================
// CLEAR CART (Protected - requireAuth)
// ==============================
export const clearCart = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    console.log(`🧹 User ${user.email} (ID: ${user.id}) clearing cart`);

    const cart = await getOrCreateCart(user.id);

    // Delete all cart items
    const deletedCount = await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    console.log(`✅ Cart cleared: ${deletedCount.count} items removed`);

    return c.json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        id: cart.id,
        userId: cart.userId,
        items: [],
        totalItems: 0,
        totalAmount: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET CART SUMMARY (POST - Protected)
// ==============================
export const getCartSummary = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    console.log(`📊 User ${user.email} (ID: ${user.id}) fetching cart summary`);

    const cart = await getOrCreateCart(user.id);

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = parseFloat(
      cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ).toFixed(2)
    );

    console.log(`✅ Cart summary: ${totalItems} items, $${totalAmount}`);

    return c.json({
      success: true,
      message: "Cart summary retrieved successfully",
      data: {
        totalItems,
        totalAmount
      },
    });
  } catch (error) {
    console.error('❌ Error fetching cart summary:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET CART SUMMARY (GET - Protected)
// For backward compatibility with existing frontend
// ==============================
export const getCartSummaryGet = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    console.log(`📊 User ${user.email} (ID: ${user.id}) fetching cart summary (GET)`);

    const cart = await getOrCreateCart(user.id);

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = parseFloat(
      cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ).toFixed(2)
    );

    console.log(`✅ Cart summary: ${totalItems} items, $${totalAmount}`);

    return c.json({
      success: true,
      message: "Cart summary retrieved successfully",
      data: {
        totalItems,
        totalAmount
      },
    });
  } catch (error) {
    console.error('❌ Error fetching cart summary:', error);
    return serverError(c, error);
  }
};