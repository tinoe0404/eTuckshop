// src/index.ts
import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { compress } from "hono/compress"; // Recommended for performance
import { secureHeaders } from "hono/secure-headers"; // Hono built-in is cleaner
import { serve } from "bun";
import { prisma } from "./utils/prisma";

// Import Routes
import authRoutes from "./routes/auth.route";
import productRoutes from "./routes/products.route";
import categoryRoutes from "./routes/category.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/orders.route";
import analyticsRoutes from "./routes/analytics.route";
import customerRoutes from "./routes/customer.route";

const app = new Hono();

// ==============================
// MIDDLEWARE
// ==============================

// 1. Logger
app.use(logger());

// 2. Compression (Gzip/Brotli)
app.use(compress());

// 3. Security Headers
app.use(secureHeaders()); 
// Add custom no-cache headers for API data
app.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
});

// 4. CORS
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return "*";

      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://e-tuckshop.vercel.app",
        "https://etuckshop-backend.onrender.com",
      ];

      // Exact match
      if (allowedOrigins.includes(origin)) return origin;

      // Vercel Preview Deployments (wildcard logic)
      if (origin.endsWith(".vercel.app")) return origin;

      // Production fallback: Reject unknown origins
      if (process.env.NODE_ENV === "production") {
        console.warn("⚠️ Blocked CORS origin:", origin);
        return allowedOrigins[0]; 
      }

      return origin;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-User-ID"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 86400,
  })
);

// ==============================
// ROUTES
// ==============================

// Health Check
app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({
      success: true,
      status: "healthy",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      status: "unhealthy", 
      database: "disconnected" 
    }, 503);
  }
});

// Root
app.get("/", (c) => c.json({
  success: true,
  message: "eTuckshop API v1.0",
  status: "online",
  docs: "/api/docs" 
}));

// API Routes
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/products", productRoutes);
api.route("/categories", categoryRoutes);
api.route("/cart", cartRoutes);
api.route("/orders", orderRoutes);
api.route("/analytics", analyticsRoutes);
api.route("/customers", customerRoutes);

app.route("/api", api);

// ==============================
// ERROR HANDLING
// ==============================

app.notFound((c) => c.json({ success: false, message: "Endpoint not found" }, 404));

app.onError((err, c) => {
  console.error("🔥 Server Error:", err);
  const isDev = process.env.NODE_ENV !== "production";
  
  return c.json({
    success: false,
    message: isDev ? err.message : "Internal server error",
    stack: isDev ? err.stack : undefined,
  }, 500);
});

// ==============================
// SERVER STARTUP
// ==============================

async function startServer() {
  try {
    // 1. Connect DB
    await prisma.$connect();
    console.log("✅ Database connected");

    // 2. Start Server
    const port = Number(process.env.PORT) || 5000;
    
    serve({
      port,
      fetch: app.fetch,
      hostname: "0.0.0.0" 
    });

    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
}

startServer();