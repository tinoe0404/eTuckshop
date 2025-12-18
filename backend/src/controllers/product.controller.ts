// src/controllers/product.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { getStockLevel } from "../utils/stock";
import { serverError } from "../utils/serverError";

// ==============================
// GET ALL PRODUCTS (Public)
// ==============================
export const getAllProducts = async (c: Context) => {
  try {
    console.log('📦 Fetching all products');

    const products = await prisma.product.findMany({
      include: { category: true },
    });

    console.log(`✅ Retrieved ${products.length} products`);

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCT BY ID (Public)
// ==============================
export const getProductById = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    console.log(`🔍 Fetching product ID: ${id}`);

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      console.log(`❌ Product ${id} not found`);
      return c.json(
        { success: false, message: "Product not found" },
        404
      );
    }

    console.log(`✅ Product found: ${product.name}`);

    return c.json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        ...product,
        stockLevel: getStockLevel(product.stock),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET PRODUCTS BY CATEGORY (Public)
// ==============================
export const getProductsByCategory = async (c: Context) => {
  try {
    const categoryId = Number(c.req.param("categoryId"));
    console.log(`📂 Fetching products for category ID: ${categoryId}`);

    const products = await prisma.product.findMany({
      where: { categoryId },
      include: { category: true },
    });

    console.log(`✅ Retrieved ${products.length} products for category ${categoryId}`);

    return c.json({
      success: true,
      message: "Products retrieved successfully",
      data: products.map((p) => ({
        ...p,
        stockLevel: getStockLevel(p.stock),
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    return serverError(c, error);
  }
};

// ==============================
// CREATE PRODUCT (Admin Only)
// ==============================
export const createProduct = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`➕ Admin ${user.email} (ID: ${user.id}) creating new product`);

    const { name, description, price, stock, categoryId } = await c.req.json();

    // Validation
    if (!name || !price || stock === undefined || !categoryId) {
      return c.json({ 
        success: false,
        message: "Missing required fields: name, price, stock, categoryId" 
      }, 400);
    }

    const parsedCategoryId = Number(categoryId);

    // Validate categoryId
    if (!parsedCategoryId || isNaN(parsedCategoryId)) {
      return c.json({ 
        success: false,
        message: "Invalid categoryId" 
      }, 400);
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      console.log(`❌ Category ${parsedCategoryId} does not exist`);
      return c.json({ 
        success: false,
        message: "Category does not exist" 
      }, 404);
    }

    // Create the product
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

    console.log(`✅ Product created: ${product.name} (ID: ${product.id}) by ${user.email}`);

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
    console.error('❌ Error creating product:', error);
    return serverError(c, error);
  }
};

// ==============================
// UPDATE PRODUCT (Admin Only)
// ==============================
export const updateProduct = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    const id = Number(c.req.param("id"));
    console.log(`✏️ Admin ${user.email} (ID: ${user.id}) updating product ${id}`);

    const data = await c.req.json();

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({ 
      where: { id } 
    });

    if (!existingProduct) {
      console.log(`❌ Product ${id} not found`);
      return c.json(
        { success: false, message: "Product not found" },
        404
      );
    }

    // Convert types if present
    if (data.price !== undefined) data.price = parseFloat(data.price);
    if (data.stock !== undefined) data.stock = parseInt(data.stock);
    if (data.categoryId !== undefined) {
      data.categoryId = parseInt(data.categoryId);
      
      // Verify category exists if being changed
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      
      if (!category) {
        return c.json({ 
          success: false,
          message: "Category does not exist" 
        }, 404);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    console.log(`✅ Product updated: ${updated.name} (ID: ${id}) by ${user.email}`);

    return c.json({
      success: true,
      message: "Product updated successfully",
      data: {
        ...updated,
        stockLevel: getStockLevel(updated.stock),
      },
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return serverError(c, error);
  }
};

// ==============================
// DELETE PRODUCT (Admin Only)
// ==============================
export const deleteProduct = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    const id = Number(c.req.param("id"));
    console.log(`🗑️ Admin ${user.email} (ID: ${user.id}) deleting product ${id}`);

    const product = await prisma.product.findUnique({ where: { id } });
    
    if (!product) {
      console.log(`❌ Product ${id} not found`);
      return c.json(
        { success: false, message: "Product not found" },
        404
      );
    }

    // Check if product is in any active orders or carts
    const [activeOrders, cartItems] = await Promise.all([
      prisma.orderItem.count({
        where: {
          productId: id,
          order: {
            status: { in: ["PENDING", "PAID"] }
          }
        }
      }),
      prisma.cartItem.count({
        where: { productId: id }
      })
    ]);

    if (activeOrders > 0) {
      console.log(`⚠️ Cannot delete product ${id} - has ${activeOrders} active orders`);
      return c.json({
        success: false,
        message: "Cannot delete product with active orders. Complete or cancel orders first.",
      }, 400);
    }

    if (cartItems > 0) {
      console.log(`⚠️ Product ${id} has ${cartItems} cart items - removing them`);
      // Remove from carts before deleting
      await prisma.cartItem.deleteMany({
        where: { productId: id }
      });
    }

    await prisma.product.delete({ where: { id } });

    console.log(`✅ Product deleted: ${product.name} (ID: ${id}) by ${user.email}`);

    return c.json({
      success: true,
      message: "Product deleted successfully",
      data: { id, name: product.name },
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return serverError(c, error);
  }
};