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

// ✅ SIMPLIFIED PRODUCTION-READY CORS Configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      // List of allowed origins
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://e-tuckshop.vercel.app",
        "https://dashboard.render.com",
      ];
      
      // Allow if no origin (Postman, mobile apps, etc.)
      if (!origin) return allowedOrigins[0];
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      
      // Allow all Vercel preview deployments (*.vercel.app)
      if (origin.endsWith(".vercel.app")) {
        return origin;
      }
      
      // Reject all others
      return allowedOrigins[0]; // Fallback to localhost
    },
    credentials: true, // ✅ Essential for httpOnly cookies
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Set-Cookie",
      "X-Requested-With",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"], // ✅ Let frontend see Set-Cookie headers
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Health / root endpoint
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

// 404 handler for undefined routes
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Route not found",
      requestedPath: c.req.path,
    },
    404
  );
});

// Global error handler
app.onError((err: Error, c) => {
  console.error("🔥 Global Error:", err);
  
  // Don't expose internal errors in production
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

// Start server
(async () => {
  await checkDbConnection();

  const port = Number(process.env.PORT) || 5000;

  serve({ 
    port, 
    fetch: app.fetch,
    development: process.env.NODE_ENV !== "production",
  });

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
})();