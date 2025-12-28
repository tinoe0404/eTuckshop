// src/controllers/category.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { getOrSetCache, cache } from "../utils/redis";

const CATEGORY_TTL = 3600; // 1 Hour

// ==============================
// GET ALL CATEGORIES (Cached)
// ==============================
export const getAllCategories = async (c: Context) => {
  try {
    const categories = await getOrSetCache("categories:all", async () => {
      console.log('📂 Fetching all categories from DB');
      const cats = await prisma.category.findMany({
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      
      return cats.map((cat) => ({
        ...cat,
        productCount: cat._count.products,
      }));
    }, CATEGORY_TTL);

    return c.json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET CATEGORY BY ID (Cached)
// ==============================
export const getCategoryById = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    const cacheKey = `categories:${id}`;

    const category = await getOrSetCache(cacheKey, async () => {
      console.log(`🔍 Fetching category ${id} from DB`);
      const cat = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              description: true,
            },
          },
          _count: { select: { products: true } },
        },
      });

      if (!cat) return null;

      return {
        ...cat,
        productCount: cat._count.products,
      };
    }, CATEGORY_TTL);

    if (!category) {
      return c.json({ success: false, message: "Category not found" }, 404);
    }

    return c.json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// CREATE CATEGORY (Admin Only)
// ==============================
export const createCategory = async (c: Context) => {
  try {
    const user = c.get("user");
    const { name, description } = await c.req.json();

    if (!name?.trim()) {
      return c.json({ success: false, message: "Category name is required" }, 400);
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return c.json({ success: false, message: "Category already exists" }, 400);
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    // 🔄 Invalidate "All Categories" and "Stats" caches
    await Promise.all([
      cache.del("categories:all"),
      cache.del("categories:stats"),
    ]);

    return c.json({
      success: true,
      message: "Category created successfully",
      data: category,
    }, 201);
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// UPDATE CATEGORY (Admin Only)
// ==============================
export const updateCategory = async (c: Context) => {
  try {
    const user = c.get("user");
    const id = Number(c.req.param("id"));
    const { name, description } = await c.req.json();

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) return c.json({ success: false, message: "Category not found" }, 404);

    if (name && name.trim() !== existingCategory.name) {
      const duplicate = await prisma.category.findUnique({ where: { name: name.trim() } });
      if (duplicate) return c.json({ success: false, message: "Category name exists" }, 400);
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    // 🔄 Invalidate caches: All List, Specific ID, and Stats
    await Promise.all([
      cache.del("categories:all"),
      cache.del(`categories:${id}`),
      cache.del("categories:stats"),
    ]);

    return c.json({
      success: true,
      message: "Category updated successfully",
      data: { ...updatedCategory, productCount: updatedCategory._count.products },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// DELETE CATEGORY (Admin Only)
// ==============================
export const deleteCategory = async (c: Context) => {
  try {
    const user = c.get("user");
    const id = Number(c.req.param("id"));

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) return c.json({ success: false, message: "Category not found" }, 404);

    if (category._count.products > 0) {
      return c.json({
        success: false,
        message: `Cannot delete category with ${category._count.products} associated products.`,
      }, 400);
    }

    await prisma.category.delete({ where: { id } });

    // 🔄 Invalidate caches
    await Promise.all([
      cache.del("categories:all"),
      cache.del(`categories:${id}`),
      cache.del("categories:stats"),
    ]);

    return c.json({
      success: true,
      message: "Category deleted successfully",
      data: { id, name: category.name },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET CATEGORY STATISTICS (Cached)
// ==============================
export const getCategoryStats = async (c: Context) => {
  try {
    const stats = await getOrSetCache("categories:stats", async () => {
      console.log('📊 Fetching category stats from DB');
      const data = await prisma.category.findMany({
        include: {
          _count: { select: { products: true } },
          products: { select: { price: true, stock: true } },
        },
      });

      return data.map((cat) => {
        const totalProducts = cat._count.products;
        const totalStock = cat.products.reduce((sum, p) => sum + p.stock, 0);
        const avgPrice = totalProducts > 0
            ? cat.products.reduce((sum, p) => sum + p.price, 0) / totalProducts
            : 0;

        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          totalProducts,
          totalStock,
          averagePrice: parseFloat(avgPrice.toFixed(2)),
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        };
      });
    }, 300); // 5 Minutes TTL (stats don't need to be instant)

    return c.json({
      success: true,
      message: "Category statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    return serverError(c, error);
  }
};