// src/utils/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get<T>(key);
      if (data) {
        console.log(`🎯 Cache HIT: ${key}`);
      } else {
        console.log(`❌ Cache MISS: ${key}`);
      }
      return data;
    } catch (error) {
      console.error(`⚠️ Redis GET error for ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached data with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error(`⚠️ Redis SET error for ${key}:`, error);
    }
  },

  /**
   * Delete a single key
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
      console.log(`🗑️ Cache DEL: ${key}`);
    } catch (error) {
      console.error(`⚠️ Redis DEL error for ${key}:`, error);
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️ Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      console.error(`⚠️ Redis DEL pattern error for ${pattern}:`, error);
    }
  },

  /**
   * Invalidate all product caches
   */
  async invalidateProducts(): Promise<void> {
    await Promise.all([
      cache.delPattern("products:*"),
      cache.delPattern("categories:*"), // Categories may contain product counts
    ]);
    console.log("🔄 Product caches invalidated");
  },

  /**
   * Invalidate all analytics caches
   * Call this when orders are created/updated/completed
   */
  async invalidateAnalytics(): Promise<void> {
    await cache.delPattern("analytics:*");
    console.log("🔄 Analytics caches invalidated");
  },

  /**
   * Invalidate everything (nuclear option)
   * Use sparingly - only for major data changes
   */
  async invalidateAll(): Promise<void> {
    await Promise.all([
      cache.delPattern("products:*"),
      cache.delPattern("categories:*"),
      cache.delPattern("analytics:*"),
    ]);
    console.log("🔄 All caches invalidated");
  },
};