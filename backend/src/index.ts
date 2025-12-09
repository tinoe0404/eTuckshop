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

// ✅ FIXED CORS Configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
      
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return CLIENT_URL;
      
      // Allow localhost in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return origin;
      }
      
      // Allow your production frontend URL
      if (origin === CLIENT_URL) {
        return origin;
      }
      
      // For Vercel deployments, you might need to allow preview URLs
      if (origin.includes("vercel.app")) {
        return origin;
      }
      
      // Block all other origins
      return CLIENT_URL; // fallback
    },
    credentials: true, // ✅ Essential for cookies
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Set-Cookie",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);


// Health / root endpoint
app.get("/api", (c) => {
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
app.route("/api/customer", customerRoutes);

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