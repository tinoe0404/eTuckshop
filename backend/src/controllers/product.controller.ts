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

// ==============================
// GET PRODUCTS BY CATEGORY
// ==============================
export const getProductsByCategory = async (c: Context) => {
    const categoryId = Number(c.req.param("categoryId"));
  
    const products = await prisma.product.findMany({
      where: { categoryId },
      include: { category: true },
    });
  
    return c.json(
      products.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      }))
    );
  };

// ==============================
// CREATE PRODUCT (ADMIN ONLY)
// ==============================
export const createProduct = async (c: Context) => {
    const user = c.get("user"); // assuming auth middleware
    if (!user || user.role !== "ADMIN")
      return c.json({ error: "Unauthorized" }, 401);
  
    const { name, description, price, stock, categoryId } = await c.req.json();
  
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        categoryId,
        stockLevel: getStockLevel(stock),
      },
    });
  
    return c.json(product, 201);
  };

// ==============================
// UPDATE PRODUCT (ADMIN ONLY)
// ==============================
export const updateProduct = async (c: Context) => {
    const user = c.get("user");
    if (!user || user.role !== "ADMIN")
      return c.json({ error: "Unauthorized" }, 401);
  
    const id = Number(c.req.param("id"));
    const data = await c.req.json();
  
    // If stock is updated → recalc stockLevel
    if (data.stock !== undefined) {
      data.stockLevel = getStockLevel(data.stock);
    }
  
    const updated = await prisma.product.update({
      where: { id },
      data,
    });
  
    return c.json(updated);
  };

// ==============================
// DELETE PRODUCT (ADMIN ONLY)
// ==============================
export const deleteProduct = async (c: Context) => {
    const user = c.get("user");
    if (!user || user.role !== "ADMIN")
      return c.json({ error: "Unauthorized" }, 401);
  
    const id = Number(c.req.param("id"));
  
    await prisma.product.delete({
      where: { id },
    });
  
    return c.json({ message: "Product deleted successfully" });
  };