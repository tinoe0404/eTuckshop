// src/index.ts - COMPLETE FIX

import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serve } from "bun";
import { prisma } from "./utils/prisma";
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

// ✅ SECURITY HEADERS MIDDLEWARE (MUST BE BEFORE CORS)
app.use("*", async (c, next) => {
  await next();
  
  // Set security headers on every response
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  
  // httpS-only in production
  if (process.env.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// ✅ CORS Configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://e-tuckshop.vercel.app",
        "https://etuckshop-backend.onrender.com",
      ];
      
      if (!origin) return allowedOrigins[0];
      if (allowedOrigins.includes(origin)) return origin;
      if (origin.endsWith(".vercel.app")) return origin;
      
      return allowedOrigins[0];
    },
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Set-Cookie",
      "X-Requested-With",
      "X-User-ID",  // ✅ ADD THIS LINE
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 86400,
  })
);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "eTuckshop API",
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    documentation: "/api",
  });
});

// Health check endpoint
app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return c.json({
      success: true,
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: "connected",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

// API info endpoint
app.get("/api", (c) => {
  return c.json({
    success: true,
    message: "eTuckshop API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    cors: {
      allowedOrigin: process.env.CLIENT_URL || "http://localhost:3000",
    },
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      cart: "/api/cart",
      orders: "/api/orders",
      analytics: "/api/analytics",
      customer: "/api/customers",
    },
    health: "/health",
  });
});

// Check DB connection
async function checkDbConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database query test passed!");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    console.error("💡 Check your DATABASE_URL environment variable");
    process.exit(1);
  }
}

// Attach routes (mount under /api base path)
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/products", productRoutes);
api.route("/categories", categoryRoutes);
api.route("/cart", cartRoutes);
api.route("/orders", orderRoutes);
api.route("/analytics", analyticsRoutes);
api.route("/customers", customerRoutes);

// Mount all API routes under /api
app.route("/api", api);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Route not found",
      requestedPath: c.req.path,
      availableEndpoints: {
        root: "/",
        health: "/health",
        api: "/api",
      },
    },
    404
  );
});

// Global error handler
app.onError((err: Error, c) => {
  console.error("🔥 Global Error:", err);
  
  const isProduction = process.env.NODE_ENV === "production";
  
  return c.json(
    {
      success: false,
      message: isProduction ? "Internal server error" : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
    500
  );
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📛 SIGTERM received, closing server gracefully...");
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📛 SIGINT received, closing server gracefully...");
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
  process.exit(0);
});

// Start server
(async () => {
  await checkDbConnection();

  const port = Number(process.env.PORT) || 5000;
  const host = "0.0.0.0";

  serve({ 
    port,
    hostname: host,
    fetch: app.fetch,
    development: process.env.NODE_ENV !== "production",
  });

  console.log("=".repeat(50));
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log(`📚 API info: http://localhost:${port}/api`);
  console.log("=".repeat(50));
})();