// File: src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: undefined | ReturnType<typeof createPrismaClient>;
};

// 1. Create the base client with logging
const basePrisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// 2. Define the extension to convert Decimals to Numbers
const createPrismaClient = () => {
  return basePrisma.$extends({
    result: {
      product: {
        price: {
          needs: { price: true },
          compute(product) {
            return Number(product.price);
          },
        },
      },
      order: {
        totalAmount: {
          needs: { totalAmount: true },
          compute(order) {
            return Number(order.totalAmount);
          },
        },
      },
      orderItem: {
        subtotal: {
          needs: { subtotal: true },
          compute(item) {
            return Number(item.subtotal);
          },
        },
        priceAtPurchase: {
          needs: { priceAtPurchase: true },
          compute(item) {
            return Number(item.priceAtPurchase);
          },
        },
      },
    },
  });
};

// 3. Export the extended client (Singleton pattern)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 4. Test connection on startup (Using the base client for raw connection test)
basePrisma.$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((error) => console.error('❌ Database connection failed:', error));