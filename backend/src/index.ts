import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers"; // ✅ ADD THIS
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

app.use("*", secureHeaders({
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
  xXssProtection: "1; mode=block",
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
}));



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

// ✅ Root endpoint - This fixes the 404 on /
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

// ✅ Health check endpoint - For monitoring services
app.get("/health", async (c) => {
  try {
    // Check database connection
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

// ✅ API info endpoint
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
    health: "/health",
  });
});

// Check DB connection
async function checkDbConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    
    // Optional: Test query to ensure DB is truly accessible
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database query test passed!");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    console.error("💡 Check your DATABASE_URL environment variable");
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

// Graceful shutdown handler
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
  const host = "0.0.0.0"; // ✅ Bind to all interfaces for Render

  serve({ 
    port,
    hostname: host, // ✅ Important for cloud platforms
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