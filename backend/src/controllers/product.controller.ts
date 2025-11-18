import { Context } from "hono";
import { prisma } from "../utils/db";
import { getStockLevel } from "../utils/stock";

// ==============================
// GET ALL PRODUCTS
// ==============================
export const getAllProducts = async (c: Context) => {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
    });
  
    const updated = products.map((p) => ({
      ...p,
      stockLevel: getStockLevel(p.stock),
    }));
  
    return c.json(updated);
  };

// ==============================
// GET PRODUCT BY ID
// ==============================
export const getProductById = async (c: Context) => {
    const id = Number(c.req.param("id"));
  
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  
    if (!product) return c.json({ error: "Product not found" }, 404);
  
    return c.json({
      ...product,
      stockLevel: getStockLevel(product.stock),
    });
  };
  