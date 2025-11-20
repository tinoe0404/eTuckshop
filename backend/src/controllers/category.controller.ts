import { Context } from "hono";
import { prisma } from "../utils/db";
import { serverError } from "../utils/serverError";

// ==============================
// GET ALL CATEGORIES (Public)
// ==============================
export const getAllCategories = async (c: Context) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories.map((cat) => ({
        ...cat,
        productCount: cat._count.products,
      })),
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==============================
// GET CATEGORY BY ID (Public)
// ==============================
export const getCategoryById = async (c: Context) => {
    try {
      const id = Number(c.req.param("id"));
  
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
        return c.json(
          { success: false, message: "Category not found" },
          404
        );
      }
  
      return c.json({
        success: true,
        message: "Category retrieved successfully",
        data: {
          ...category,
          productCount: category._count.products,
        },
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
      const { name, description } = await c.req.json();
  
      // Validate required fields
      if (!name || name.trim() === "") {
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
  
      return c.json(
        {
          success: true,
          message: "Category created successfully",
          data: category,
        },
        201
      );
    } catch (error) {
      return serverError(c, error);
    }
  };

// UPDATE CATEGORY (Admin Only)
// ==============================
export const updateCategory = async (c: Context) => {
try {
    const id = Number(c.req.param("id"));
    const { name, description } = await c.req.json();

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
    where: { id },
    });

    if (!existingCategory) {
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

    return c.json({
    success: true,
    message: "Category updated successfully",
    data: {
        ...updatedCategory,
        productCount: updatedCategory._count.products,
    },
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
      const id = Number(c.req.param("id"));
  
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
        return c.json(
          { success: false, message: "Category not found" },
          404
        );
      }
  
      // Check if category has products
      if (category._count.products > 0) {
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
  
      return c.json({
        success: true,
        message: "Category deleted successfully",
        data: { id },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };
  

  