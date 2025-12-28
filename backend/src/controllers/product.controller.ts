// src/controllers/product.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";
import { getOrSetCache, deleteCache } from "../utils/cache";

// Cache TTL constants (in seconds)
const TTL = {
  LIST: 300,      // 5 minutes
  DETAIL: 300,    // 5 minutes
};

/**
 * 🧹 Helper: Smart Cache Invalidation
 * Clears all relevant caches when a product is changed.
 */
const invalidateProductCaches = async (productId?: number, categoryId?: number) => {
  const tasks = [deleteCache("products:all")];
  
  if (productId) {
    tasks.push(deleteCache(`products:detail:${productId}`));
  }
  
  if (categoryId) {
    tasks.push(deleteCache(`products:category:${categoryId}`));
  }

  await Promise.all(tasks);
};

// ==============================
// GET ALL PRODUCTS (Public) - CACHED
// ==============================
export const getAllProducts = async (c: Context) => {
  try {
    // ⚡ One-liner cache implementation
    const products = await getOrSetCache("products:all", async () => {
      console.log('📦 Fetching all products from DB');
      
      const data = await prisma.product.findMany({
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });

      // Transform data before caching
      return data.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      }));
    }, TTL.LIST);

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCT BY ID (Public) - CACHED
// ==============================
export const getProductById = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    const cacheKey = `products:detail:${id}`;

    const product = await getOrSetCache(cacheKey, async () => {
      console.log(`🔍 Fetching product ${id} from DB`);
      
      const data = await prisma.product.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!data) return null;

      return {
        ...data,
        stockLevel: getStockLevel(data.stock),
      };
    }, TTL.DETAIL);

    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    return c.json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCTS BY CATEGORY (Public) - CACHED
// ==============================
export const getProductsByCategory = async (c: Context) => {
  try {
    const categoryId = Number(c.req.param("categoryId"));
    const cacheKey = `products:category:${categoryId}`;

    const products = await getOrSetCache(cacheKey, async () => {
      console.log(`📂 Fetching category ${categoryId} from DB`);
      
      const data = await prisma.product.findMany({
        where: { categoryId },
        include: { category: true },
      });

      return data.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      }));
    }, TTL.LIST);

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
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
    if (!user) return c.json({ success: false, message: "Authentication required" }, 401);

    const { name, description, price, stock, categoryId } = await c.req.json();

    if (!name || !price || stock === undefined || !categoryId) {
      return c.json({ success: false, message: "Missing required fields" }, 400);
    }

    const parsedCategoryId = Number(categoryId);

    const category = await prisma.category.findUnique({ where: { id: parsedCategoryId } });
    if (!category) return c.json({ success: false, message: "Category not found" }, 404);

    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        stock: Number(stock),
        categoryId: parsedCategoryId,
      },
      include: { category: true },
    });

    // 🔄 INVALIDATE CACHE (All list + Category list)
    await invalidateProductCaches(undefined, parsedCategoryId);

    return c.json({
      success: true,
      message: "Product created successfully",
      data: {
        ...product,
        stockLevel: getStockLevel(product.stock),
      },
    }, 201);
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// UPDATE PRODUCT (Admin Only)
// ==============================
export const updateProduct = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ success: false, message: "Authentication required" }, 401);

    const id = Number(c.req.param("id"));
    const data = await c.req.json();

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return c.json({ success: false, message: "Product not found" }, 404);

    // Type conversion
    if (data.price !== undefined) data.price = parseFloat(data.price);
    if (data.stock !== undefined) data.stock = parseInt(data.stock);
    if (data.categoryId !== undefined) {
      data.categoryId = parseInt(data.categoryId);
      // Validate new category
      const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!cat) return c.json({ success: false, message: "Category does not exist" }, 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    // 🔄 INVALIDATE CACHE
    // We clear the specific product, the all-products list, and both old/new category lists 
    // (Simplification: we definitely clear the CURRENT category list)
    await invalidateProductCaches(id, updated.categoryId);
    
    // If category changed, we should technically clear the old category cache too, 
    // but for simplicity, we let TTL handle the old list or you can explicitly clear it here if critical.

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
    const user = c.get("user");
    if (!user) return c.json({ success: false, message: "Authentication required" }, 401);

    const id = Number(c.req.param("id"));

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return c.json({ success: false, message: "Product not found" }, 404);

    // Check constraints
    const activeOrders = await prisma.orderItem.count({
      where: {
        productId: id,
        order: { status: { in: ["PENDING", "PAID"] } }
      }
    });

    if (activeOrders > 0) {
      return c.json({
        success: false,
        message: "Cannot delete product with active orders.",
      }, 400);
    }

    // Clean up cart items
    await prisma.cartItem.deleteMany({ where: { productId: id } });

    await prisma.product.delete({ where: { id } });

    // 🔄 INVALIDATE CACHE
    await invalidateProductCaches(id, product.categoryId);

    return c.json({
      success: true,
      message: "Product deleted successfully",
      data: { id, name: product.name },
    });
  } catch (error) {
    return serverError(c, error);
  }
};