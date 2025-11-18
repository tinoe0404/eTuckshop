import { Context } from "hono";
import { prisma } from "../utils/db";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";

// ==============================
// GET ALL PRODUCTS
// ==============================
export const getAllProducts = async (c: Context) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
    });

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      })),
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCT BY ID
// ==============================
export const getProductById = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product)
      return c.json(
        { success: false, message: "Product not found" },
        404
      );

    return c.json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        ...product,
        stockLevel: getStockLevel(product.stock),
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCT BY CATEGORY
// ==============================
export const getProductsByCategory = async (c: Context) => {
  try {
    const categoryId = Number(c.req.param("categoryId"));

    const products = await prisma.product.findMany({
      where: { categoryId },
      include: { category: true },
    });

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      })),
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// CREATE PRODUCT (ADMIN ONLY)
// ==============================
export const createProduct = async (c: Context) => {
    const user = c.get("user");
    if (!user) return c.json({ message: "Unauthorized" }, 401);
  
    // optional extra check if not using protectAdmin middleware
    if (user.role.toUpperCase() !== "ADMIN") return c.json({ message: "Forbidden" }, 403);
  
    try {
      const { name, description, price, stock, categoryId } = await c.req.json();
      const product = await prisma.product.create({
        data: { name, description, price, stock, categoryId },
      });
      return c.json({ success: true, message: "Product created", product });
    } catch (error) {
      return c.json({ success: false, message: "Failed to create product", error });
    }
  };

// ==============================
// UPDATE PRODUCT (ADMIN ONLY)
// ==============================
export const updateProduct = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "ADMIN")
      return c.json(
        { success: false, message: "Unauthorized" },
        401
      );

    const id = Number(c.req.param("id"));
    const data = await c.req.json();

    if (data.stock !== undefined) {
      data.stockLevel = getStockLevel(data.stock);
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return c.json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// DELETE PRODUCT (ADMIN ONLY)
// ==============================
export const deleteProduct = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "ADMIN")
      return c.json(
        { success: false, message: "Unauthorized" },
        401
      );

    const id = Number(c.req.param("id"));

    await prisma.product.delete({ where: { id } });

    return c.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return serverError(c, error);
  }
};
