import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serve } from "bun";
import { prisma } from "./utils/db";
import authRoutes from "./routes/auth.route";
import productRoutes from "./routes/products.route";
import categoryRoutes from "./routes/category.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/orders.route";
import analyticsRoutes from "./routes/analytics.route";
import customerRoutes from "./routes/customer.route";

const app = new Hono();

// Middleware
app.use(logger());
app.use(
  "*",
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Health / root endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "eTuckshop API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      cart: "/api/cart",
      orders: "/api/orders",
      analytics: "/api/analytics",
      customer: "/api/customer",
    },
  });
});

// Check DB connection
async function checkDbConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
}

// Attach routes
app.route("/api/auth", authRoutes);
app.route("/api/products", productRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/cart", cartRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/customer", customerRoutes); // Fixed naming

// Global error handler
app.onError((err: Error, c) => {
  console.error("🔥 Global Error:", err);
  return c.json(
    { success: false, message: "Internal server error", error: err.message },
    500
  );
});

// Start server
(async () => {
  await checkDbConnection();

  const port = Number(process.env.PORT) || 3000;

  serve({ port, fetch: app.fetch });

  console.log(`🚀 Server running on http://localhost:${port}`);
})();
