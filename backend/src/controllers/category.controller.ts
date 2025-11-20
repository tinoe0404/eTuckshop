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

  