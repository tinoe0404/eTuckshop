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
  