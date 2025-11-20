import { Context } from "hono";
import { prisma } from "../utils/db";
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
// GET CART (Protected)
// ==============================
export const getCart = async (c: Context) => {
    try {
      const user = c.get("user");
      const cart = await getOrCreateCart(user.id);
      const cartWithTotals = calculateCartTotals(cart);
  
      return c.json({
        success: true,
        message: "Cart retrieved successfully",
        data: cartWithTotals,
      });
    } catch (error) {
      return serverError(c, error);
    }
  };


// ==============================
// ADD TO CART (Protected)
// ==============================
export const addToCart = async (c: Context) => {
    try {
      const user = c.get("user");
      const { productId, quantity = 1 } = await c.req.json();
  
      // Validate input
      if (!productId || quantity < 1) {
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
        return c.json(
          { success: false, message: "Product not found" },
          404
        );
      }
  
      if (product.stock < quantity) {
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
      } else {
        // Add new item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: parseInt(productId),
            quantity: parseInt(quantity),
          },
        });
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
      return serverError(c, error);
    }
  };

// ==============================
// UPDATE CART ITEM (Protected)
// ==============================
export const updateCartItem = async (c: Context) => {
    try {
      const user = c.get("user");
      const { productId, quantity } = await c.req.json();
  
      if (!productId || quantity < 1) {
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
        return c.json(
          { success: false, message: "Item not found in cart" },
          404
        );
      }
  
      // Check stock
      if (cartItem.product.stock < quantity) {
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
      return serverError(c, error);
    }
  };

// ==============================
// REMOVE FROM CART (Protected)
// ==============================
export const removeFromCart = async (c: Context) => {
    try {
      const user = c.get("user");
      const productId = Number(c.req.param("productId"));
  
      const cart = await getOrCreateCart(user.id);
  
      // Find and delete cart item
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
        },
      });
  
      if (!cartItem) {
        return c.json(
          { success: false, message: "Item not found in cart" },
          404
        );
      }
  
      await prisma.cartItem.delete({
        where: { id: cartItem.id },
      });
  
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
      return serverError(c, error);
    }
  };

// ==============================
// CLEAR CART (Protected)
// ==============================
export const clearCart = async (c: Context) => {
    try {
      const user = c.get("user");
      const cart = await getOrCreateCart(user.id);
  
      // Delete all cart items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
  
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
      return serverError(c, error);
    }
  };
  
