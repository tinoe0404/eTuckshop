import { redis } from "./redis";

/**
 * Generic caching wrapper.
 * Checks Redis first. If miss, runs the fetcher function, caches the result, and returns it.
 * * @param key - The Redis key (e.g., "user:123")
 * @param fetcher - Async function to get data if cache misses
 * @param ttlSeconds - Time to live in seconds (default 60)
 */
export async function getOrSetCache<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttlSeconds: number = 60
): Promise<T | null> {
  try {
    // 1. Try to get from Redis
    const cachedData = await redis.get(key) as unknown;

    if (cachedData) {
      // Handle both stringified JSON and pre-parsed objects (depending on Redis client)
      if (typeof cachedData === 'string') {
        return JSON.parse(cachedData);
      }
      return cachedData as T;
    }

    // 2. Cache Miss: Execute the fetcher (DB call)
    const data = await fetcher();

    // If DB returned nothing, return null
    if (!data) return null;

    // 3. Store in Redis
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });

    return data;
  } catch (error) {
    console.error(`⚠️ Redis Cache Error for ${key}:`, error);
    // Fail safe: If Redis is down, just return the DB result directly
    return await fetcher();
  }
}

/**
 * Deletes a specific cache key.
 * Use this when data changes (update/delete operations).
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`⚠️ Failed to delete cache for ${key}:`, error);
  }
}