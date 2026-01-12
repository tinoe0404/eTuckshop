// src/utils/redis.ts (UPDATED WITH IDEMPOTENCY FUNCTIONS)
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache TTL constants (in seconds)
export const TTL = {
  ORDER_DETAIL: 60 * 60, // 1 hour (User won't check older orders often)
  USER_ORDERS: 60 * 5,   // 5 minutes
  STATS: 60 * 5,         // 5 minutes (Expensive query)
};

/**
 * ⚡ Standardized Cache Wrapper
 * Tries to get data from Redis. If missing, runs the callback, caches the result, and returns it.
 */
export const getOrSetCache = async <T>(
  key: string,
  callback: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> => {
  try {
    // 1. Try fetch from cache
    const cachedData = await redis.get<T>(key);
    if (cachedData) {
      console.log(`🎯 Cache HIT: ${key}`);
      return cachedData;
    }

    // 2. Cache miss - execute callback
    console.log(`❌ Cache MISS: ${key} - Fetching from DB`);
    const freshData = await callback();

    // 3. Save to cache (if data exists)
    if (freshData !== null && freshData !== undefined) {
      await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
    }

    return freshData;
  } catch (error) {
    console.error(`⚠️ Redis Error (${key}):`, error);
    // Fallback: If Redis fails, just return fresh data without crashing
    return await callback();
  }
};

// ============================================
// ✅ NEW: IDEMPOTENCY HELPERS
// ============================================
/**
 * Set an idempotency key in Redis with TTL
 * Used to prevent duplicate order completions
 */
export const setIdempotencyKey = async (key: string, value: any, ttlSeconds: number = 60) => {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    console.log(`🔑 Idempotency key set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`⚠️ Redis setIdempotencyKey error (${key}):`, error);
  }
};

/**
 * Get an idempotency key from Redis
 * Returns null if key doesn't exist or is expired
 */
export const getIdempotencyKey = async (key: string) => {
  try {
    const value = await redis.get<string>(key);
    if (value) {
      console.log(`🎯 Idempotency key HIT: ${key}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error(`⚠️ Redis getIdempotencyKey error (${key}):`, error);
    return null;
  }
};

export const cache = {
  /**
   * Delete specific key
   */
  async del(key: string) {
    await redis.del(key);
  },

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Cleared ${keys.length} keys for pattern: ${pattern}`);
    }
  },

  /**
   * 🔄 Invalidate Product Caches (Used when stock changes)
   */
  async invalidateProducts() {
    await Promise.all([
      cache.delPattern("products:all"),
      cache.delPattern("products:detail:*"),
      cache.delPattern("products:category:*"),
    ]);
  },

  /**
   * 🔄 Invalidate Order Caches
   * specificOrderId: Optional. If provided, clears that specific order detail.
   * userId: Optional. If provided, clears that user's order list.
   */
  async invalidateOrders(specificOrderId?: number, userId?: number) {
    const tasks = [
      cache.del("orders:stats"), // Always clear stats on order change
      // We don't cache admin list ("orders:all") because it needs to be real-time
    ];

    if (specificOrderId) {
      tasks.push(cache.del(`orders:detail:${specificOrderId}`));
    }

    if (userId) {
      tasks.push(cache.del(`orders:user:${userId}`));
    }

    await Promise.all(tasks);
    console.log(`🔄 Order caches invalidated (ID: ${specificOrderId || 'N/A'}, User: ${userId || 'N/A'})`);
  },
};