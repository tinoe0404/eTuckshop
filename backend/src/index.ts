import "dotenv/config";
import { Hono } from "hono";
import { prisma } from "./utils/db";

const app = new Hono();

// Simple DB connection check on server start
async function checkDbConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1); // Stop server if DB connection fails
  }
}

// Routes
app.get("/", async (c) => {
  return c.text("🎉 eTuckshop backend is running!");
});

app.get("/users", async (c) => {
  const users = await prisma.user.findMany();
  return c.json(users);
});

app.get("/products", async (c) => {
  const products = await prisma.product.findMany();
  return c.json(products);
});

// Start server and check DB
checkDbConnection().then(() => {
  app.fire();
});
