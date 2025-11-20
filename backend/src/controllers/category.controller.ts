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