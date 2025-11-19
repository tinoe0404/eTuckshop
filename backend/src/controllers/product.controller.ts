import { Context } from "hono";
import { prisma } from "../utils/db";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";

// ==============================
// GET ALL PRODUCTS (Public)
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
// GET PRODUCT BY ID (Public)
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
// GET PRODUCTS BY CATEGORY (Public)
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
// CREATE PRODUCT (Admin Only)
// ==============================
export const createProduct = async (c: Context) => {
  try {
    const user = c.get("user");
    const { name, description, price, stock, categoryId } = await c.req.json();

    const parsedCategoryId = Number(categoryId);

    // 1️⃣ Validate categoryId
    if (!parsedCategoryId || isNaN(parsedCategoryId)) {
      return c.json({ error: "Invalid categoryId" }, 400);
    }

    // 2️⃣ Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      return c.json({ error: "Category does not exist" }, 404);
    }

    // 3️⃣ Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        categoryId: parsedCategoryId,
      },
      include: { category: true },
    });

    return c.json(
      {
        success: true,
        message: "Product created successfully",
        data: {
          ...product,
          stockLevel: getStockLevel(product.stock),
        },
      },
      201
    );

  } catch (error) {
    return serverError(c, error);
  }
};


// ==============================
// UPDATE PRODUCT (Admin Only)
// ==============================
export const updateProduct = async (c: Context) => {
  try {
    // User is already verified as ADMIN by middleware
    const id = Number(c.req.param("id"));
    const data = await c.req.json();

    // Convert types if present
    if (data.price) data.price = parseFloat(data.price);
    if (data.stock) data.stock = parseInt(data.stock);
    if (data.categoryId) data.categoryId = parseInt(data.categoryId);

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    return c.json({
      success: true,
      message: "Product updated successfully",
      data: {
        ...updated,
        stockLevel: getStockLevel(updated.stock),
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// DELETE PRODUCT (Admin Only)
// ==============================
export const deleteProduct = async (c: Context) => {
  try {
    // User is already verified as ADMIN by middleware
    const id = Number(c.req.param("id"));

    const product = await prisma.product.findUnique({ where: { id } });
    
    if (!product) {
      return c.json(
        { success: false, message: "Product not found" },
        404
      );
    }

    await prisma.product.delete({ where: { id } });

    return c.json({
      success: true,
      message: "Product deleted successfully",
      data: { id },
    });
  } catch (error) {
    return serverError(c, error);
  }
};