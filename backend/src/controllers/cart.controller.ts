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
  