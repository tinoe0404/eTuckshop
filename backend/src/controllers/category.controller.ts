// src/controllers/category.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";

// ==============================
// GET ALL CATEGORIES (Public)
// ==============================
export const getAllCategories = async (c: Context) => {
  try {
    console.log('📂 Fetching all categories');

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`✅ Retrieved ${categories.length} categories`);

    return c.json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories.map((cat) => ({
        ...cat,
        productCount: cat._count.products,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET CATEGORY BY ID (Public)
// ==============================
export const getCategoryById = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    console.log(`🔍 Fetching category ID: ${id}`);

    const category = await prisma.category.findUnique({
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
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      console.log(`❌ Category ${id} not found`);
      return c.json(
        { success: false, message: "Category not found" },
        404
      );
    }

    console.log(`✅ Category found: ${category.name} (${category._count.products} products)`);

    return c.json({
      success: true,
      message: "Category retrieved successfully",
      data: {
        ...category,
        productCount: category._count.products,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching category:', error);
    return serverError(c, error);
  }
};

// ==============================
// CREATE CATEGORY (Admin Only)
// ==============================
export const createCategory = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`➕ Admin ${user.email} (ID: ${user.id}) creating new category`);

    const { name, description } = await c.req.json();

    // Validate required fields
    if (!name || name.trim() === "") {
      console.log('❌ Validation failed: Category name is required');
      return c.json(
        { success: false, message: "Category name is required" },
        400
      );
    }

    // Check if category already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      console.log(`❌ Category "${name}" already exists`);
      return c.json(
        { success: false, message: "Category already exists" },
        400
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    console.log(`✅ Category created: ${category.name} (ID: ${category.id}) by ${user.email}`);

    return c.json(
      {
        success: true,
        message: "Category created successfully",
        data: category,
      },
      201
    );
  } catch (error) {
    console.error('❌ Error creating category:', error);
    return serverError(c, error);
  }
};

// ==============================
// UPDATE CATEGORY (Admin Only)
// ==============================
export const updateCategory = async (c: Context) => {
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
    console.log(`✏️ Admin ${user.email} (ID: ${user.id}) updating category ${id}`);

    const { name, description } = await c.req.json();

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      console.log(`❌ Category ${id} not found`);
      return c.json(
        { success: false, message: "Category not found" },
        404
      );
    }

    // If updating name, check if new name already exists
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: { name: name.trim() },
      });

      if (duplicateCategory) {
        console.log(`❌ Category name "${name}" already exists`);
        return c.json(
          { success: false, message: "Category name already exists" },
          400
        );
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    console.log(`✅ Category updated: ${updatedCategory.name} (ID: ${id}) by ${user.email}`);

    return c.json({
      success: true,
      message: "Category updated successfully",
      data: {
        ...updatedCategory,
        productCount: updatedCategory._count.products,
      },
    });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    return serverError(c, error);
  }
};

// ==============================
// DELETE CATEGORY (Admin Only)
// ==============================
export const deleteCategory = async (c: Context) => {
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
    console.log(`🗑️ Admin ${user.email} (ID: ${user.id}) deleting category ${id}`);

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      console.log(`❌ Category ${id} not found`);
      return c.json(
        { success: false, message: "Category not found" },
        404
      );
    }

    // Check if category has products
    if (category._count.products > 0) {
      console.log(`⚠️ Cannot delete category ${id} - has ${category._count.products} products`);
      return c.json(
        {
          success: false,
          message: `Cannot delete category. It has ${category._count.products} product(s) associated with it.`,
        },
        400
      );
    }

    // Delete category
    await prisma.category.delete({ where: { id } });

    console.log(`✅ Category deleted: ${category.name} (ID: ${id}) by ${user.email}`);

    return c.json({
      success: true,
      message: "Category deleted successfully",
      data: { id, name: category.name },
    });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    return serverError(c, error);
  }
};

// ==============================
// GET CATEGORY STATISTICS (Admin Only)
// ==============================
export const getCategoryStats = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`📊 Admin ${user.email} (ID: ${user.id}) fetching category statistics`);

    const stats = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: {
            price: true,
            stock: true,
          },
        },
      },
    });

    const categoryStats = stats.map((cat) => {
      const totalProducts = cat._count.products;
      const totalStock = cat.products.reduce((sum, p) => sum + p.stock, 0);
      const avgPrice =
        totalProducts > 0
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

    console.log(`✅ Category statistics retrieved by ${user.email} (${categoryStats.length} categories)`);

    return c.json({
      success: true,
      message: "Category statistics retrieved successfully",
      data: categoryStats,
    });
  } catch (error) {
    console.error('❌ Error fetching category statistics:', error);
    return serverError(c, error);
  }
};