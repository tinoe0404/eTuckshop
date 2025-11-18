import "dotenv/config";
import { Hono } from "hono";
import { serve } from "bun";
import { prisma } from "./utils/db";
import { router as authRoutes } from "./routes/auth.route";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello World!");
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

// Start server
(async () => {
  await checkDbConnection();

  const port = process.env.PORT ? +process.env.PORT : 5000;

  serve({
    port,
    fetch: app.fetch,
  });

  console.log(`🚀 Server running on http://localhost:${port}`);
})();
