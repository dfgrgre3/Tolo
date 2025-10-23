import Redis from 'ioredis';
import { perfConfig, PerfMonitor } from './perf-config.js';
import { recordCacheMetric } from './db-monitor';

// Create Redis client with enhanced configuration for better performance and reliability
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_delay_on_error: 100,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      // Exponential backoff strategy
      return Math.min(retries * 100, 3000);
    }
  },
  // Performance optimizations
  enable_offline_queue: true,
  keep_alive: 1,
});

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Initialize Redis connection
if (process.env.NODE_ENV !== 'test') {
  connectRedis();
}

// Simple compression for large objects
function compressData(data: string): string {
  // In a real implementation, you might use a proper compression library
  // For now, we'll just return the data as-is
  return data;
}

function decompressData(data: string): string {
  // In a real implementation, you would decompress the data
  // For now, we'll just return the data as-is
  return data;
}

// Cache service with generic type support
export class CacheService {
  /**
   * Get data from cache
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  static async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    try {
      const data = await redisClient.get(key);
      const duration = Date.now() - start;
      const hit = data !== null;
      
      // Record cache metric
      recordCacheMetric('get', duration, hit);
      
      if (data) {
        const decompressedData = decompressData(data);
        return JSON.parse(decompressedData) as T;
      }
      return null;
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('get', duration, false);
      console.error('Error getting data from cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const start = Date.now();
    try {
      const serializedValue = JSON.stringify(value);
      const compressedValue = compressData(serializedValue);
      
      if (ttl) {
        await redisClient.setEx(key, ttl, compressedValue);
      } else {
        await redisClient.set(key, compressedValue);
      }
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, false);
      console.error('Error setting data in cache:', error);
    }
  }

  /**
   * Delete data from cache
   * @param key Cache key
   */
  static async del(key: string): Promise<void> {
    const start = Date.now();
    try {
      await redisClient.del(key);
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, false);
      console.error('Error deleting data from cache:', error);
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns Boolean indicating if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Error checking if key exists in cache:', error);
      return false;
    }
  }

  /**
   * Get multiple keys from cache efficiently
   * @param keys Array of cache keys
   * @returns Array of cached values in the same order as keys
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const start = Date.now();
    try {
      const results = await redisClient.mGet(keys);
      const duration = Date.now() - start;
      // Count hits (non-null values)
      const hitCount = results.filter(r => r !== null).length;
      recordCacheMetric('mget', duration, hitCount > 0);
      
      return results.map(result => {
        if (result) {
          const decompressedData = decompressData(result);
          return JSON.parse(decompressedData) as T;
        }
        return null;
      });
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mget', duration, false);
      console.error('Error getting multiple keys from cache:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs in cache with pipeline for better performance
   * @param keyValuePairs Object with key-value pairs to cache
   * @param ttl Time to live in seconds
   */
  static async mset<T>(keyValuePairs: Record<string, T>, ttl?: number): Promise<void> {
    const start = Date.now();
    try {
      const pipeline = redisClient.multi();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        const compressedValue = compressData(serializedValue);
        if (ttl) {
          pipeline.setEx(key, ttl, compressedValue);
        } else {
          pipeline.set(key, compressedValue);
        }
      }
      await pipeline.exec();
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, false);
      console.error('Error setting multiple keys in cache:', error);
    }
  }

  /**
   * Delete multiple keys from cache efficiently
   * @param keys Array of cache keys to delete
   */
  static async mdel(keys: string[]): Promise<void> {
    const start = Date.now();
    try {
      if (keys.length === 0) return;
      
      await redisClient.del(keys);
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, false);
      console.error('Error deleting multiple keys from cache:', error);
    }
  }

  /**
   * Flush all cache data (use with caution)
   */
  static async flushAll(): Promise<void> {
    const start = Date.now();
    try {
      await redisClient.flushAll();
      const duration = Date.now() - start;
      recordCacheMetric('flushAll', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('flushAll', duration, false);
      console.error('Error flushing cache:', error);
    }
  }

  /**
   * Get data from cache or fetch and cache it with fallback on cache errors
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param ttl Time to live in seconds
   * @returns Cached or fetched data
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cachedData = await this.get<T>(key);
      if (cachedData !== null) {
        return cachedData;
      }

      // Fetch data if not in cache
      const freshData = await fetchFn();

      // Store in cache with TTL
      await this.set(key, freshData, ttl);
      
      return freshData;
    } catch (error) {
      console.warn(`Cache error for key ${key}:`, error);
      // If cache fails, just fetch the data without caching
      return fetchFn();
    }
  }

  /**
   * Invalidate cache entries matching a pattern efficiently
   * @param pattern Pattern to match keys (e.g., "user:123:*")
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    const start = Date.now();
    try {
      // Use SCAN to find keys matching the pattern - safer for production than KEYS command
      const stream = redisClient.scanIterator({
        MATCH: pattern,
        COUNT: 100
      });
      
      const keysToDelete: string[] = [];
      for await (const key of stream) {
        keysToDelete.push(key);
      }
      
      // Delete all matching keys in a single operation
      if (keysToDelete.length > 0) {
        await this.mdel(keysToDelete);
      }
      
      const duration = Date.now() - start;
      recordCacheMetric('invalidatePattern', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('invalidatePattern', duration, false);
      console.error('Error invalidating cache pattern:', error);
    }
  }
}

// Provide a named export for compatibility with legacy services
export const redis = redisClient;

export default redisClient;
