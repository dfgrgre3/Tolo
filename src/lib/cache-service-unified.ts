// This file must only run on the server - prevent browser bundling
if (typeof window !== 'undefined') {
  throw new Error('cache-service-unified.ts can only be used on the server');
}

import Redis from 'ioredis';
import { perfConfig, PerfMonitor } from './perf-config';
import { recordCacheMetric } from './db-monitor';

import { logger } from '@/lib/logger';

// Create Redis client with enhanced configuration for better performance and reliability
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  reconnectOnError: (err) => {
    // Exponential backoff strategy
    return true;
  },
  // Performance optimizations
  enableOfflineQueue: true,
  keepAlive: 1,
});

// Handle Redis errors
redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
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
   * Get data from cache with timeout protection
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  static async get<T>(key: string): Promise<T | null> {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      logger.warn('Invalid cache key provided');
      return null;
    }

    const trimmedKey = key.trim();
    const start = Date.now();
    try {
      const getPromise = redisClient.get(trimmedKey);
      const timeoutPromise = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2 second timeout
      });

      const data = await Promise.race([getPromise, timeoutPromise]);
      const duration = Date.now() - start;
      const hit = data !== null;
      
      // Record cache metric
      recordCacheMetric('get', duration, hit);
      
      if (data) {
        try {
          const decompressedData = decompressData(data);
          return JSON.parse(decompressedData) as T;
        } catch (parseError) {
          logger.error('Error parsing cached data:', parseError);
          // Invalidate corrupted cache entry
          this.del(trimmedKey).catch(() => {
            // Ignore deletion errors
          });
          return null;
        }
      }
      return null;
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('get', duration, false);
      logger.error('Error getting data from cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache with timeout protection and validation
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    // Validate inputs
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      logger.warn('Invalid cache key provided');
      return;
    }

    if (ttl < 0 || ttl > 86400 * 30) { // Max 30 days
      logger.warn('Invalid TTL provided, using default');
      ttl = 3600;
    }

    const trimmedKey = key.trim();
    const start = Date.now();
    try {
      let serializedValue: string;
      try {
        serializedValue = JSON.stringify(value);
      } catch (serializeError) {
        logger.error('Error serializing value for cache:', serializeError);
        return;
      }

      const compressedValue = compressData(serializedValue);
      
      const setPromise = ttl > 0
        ? redisClient.setex(trimmedKey, ttl, compressedValue)
        : redisClient.set(trimmedKey, compressedValue);

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Cache set timeout')), 3000); // 3 second timeout
      });

      await Promise.race([setPromise, timeoutPromise]);
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, false);
      logger.error('Error setting data in cache:', error);
    }
  }

  /**
   * Delete data from cache with timeout protection
   * @param key Cache key
   */
  static async del(key: string): Promise<void> {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      logger.warn('Invalid cache key provided for deletion');
      return;
    }

    const trimmedKey = key.trim();
    const start = Date.now();
    try {
      const delPromise = redisClient.del(trimmedKey);
      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Cache delete timeout')), 2000); // 2 second timeout
      });

      await Promise.race([delPromise, timeoutPromise]);
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, false);
      logger.error('Error deleting data from cache:', error);
    }
  }

  /**
   * Get multiple values from cache with timeout protection
   * @param keys Cache keys
   * @returns Array of cached data in the same order as keys
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    // Validate keys
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      logger.warn('Invalid keys array provided for mget');
      return [];
    }

    if (keys.length > 100) {
      logger.warn('Too many keys requested, limiting to 100');
      keys = keys.slice(0, 100);
    }

    const trimmedKeys = keys
      .filter(key => key && typeof key === 'string' && key.trim().length > 0)
      .map(key => key.trim());

    if (trimmedKeys.length === 0) {
      return [];
    }

    const start = Date.now();
    try {
      const mgetPromise = redisClient.mget(trimmedKeys);
      const timeoutPromise = new Promise<(string | null)[]>((resolve) => {
        setTimeout(() => resolve(trimmedKeys.map(() => null)), 5000); // 5 second timeout
      });

      const data = await Promise.race([mgetPromise, timeoutPromise]);
      const duration = Date.now() - start;
      recordCacheMetric('mget', duration, true);
      
      return data.map(item => {
        if (item) {
          try {
            const decompressedData = decompressData(item);
            return JSON.parse(decompressedData) as T;
          } catch (parseError) {
            logger.error('Error parsing cached data in mget:', parseError);
            return null;
          }
        }
        return null;
      });
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mget', duration, false);
      logger.error('Error getting multiple data from cache:', error);
      return trimmedKeys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache with timeout protection and validation
   * @param keyValuePairs Array of [key, value] pairs
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async mset<T>(keyValuePairs: [string, T][], ttl: number = 3600): Promise<void> {
    // Validate inputs
    if (!keyValuePairs || !Array.isArray(keyValuePairs) || keyValuePairs.length === 0) {
      logger.warn('Invalid keyValuePairs array provided for mset');
      return;
    }

    if (keyValuePairs.length > 100) {
      logger.warn('Too many key-value pairs, limiting to 100');
      keyValuePairs = keyValuePairs.slice(0, 100);
    }

    if (ttl < 0 || ttl > 86400 * 30) { // Max 30 days
      logger.warn('Invalid TTL provided, using default');
      ttl = 3600;
    }

    // Filter and validate pairs
    const validPairs = keyValuePairs.filter(([key]) => 
      key && typeof key === 'string' && key.trim().length > 0
    );

    if (validPairs.length === 0) {
      logger.warn('No valid key-value pairs to set');
      return;
    }

    const start = Date.now();
    try {
      const serializedPairs: [string, string][] = [];
      
      for (const [key, value] of validPairs) {
        try {
          const serializedValue = JSON.stringify(value);
          const compressedValue = compressData(serializedValue);
          serializedPairs.push([key.trim(), compressedValue]);
        } catch (serializeError) {
          logger.error(`Error serializing value for key ${key}:`, serializeError);
          // Continue with other pairs
        }
      }

      if (serializedPairs.length === 0) {
        logger.warn('No valid serialized pairs to set');
        return;
      }
      
      const msetPromise = ttl > 0
        ? (async () => {
            const pipeline = redisClient.pipeline();
            serializedPairs.forEach(([key, value]) => {
              pipeline.setex(key, ttl, value);
            });
            await pipeline.exec();
          })()
        : redisClient.mset(serializedPairs);

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Cache mset timeout')), 10000); // 10 second timeout
      });

      await Promise.race([msetPromise, timeoutPromise]);
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, false);
      logger.error('Error setting multiple data in cache:', error);
    }
  }

  /**
   * Delete multiple keys from cache with timeout protection
   * @param keys Cache keys
   */
  static async mdel(keys: string[]): Promise<void> {
    // Validate keys
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      logger.warn('Invalid keys array provided for mdel');
      return;
    }

    if (keys.length > 100) {
      logger.warn('Too many keys to delete, limiting to 100');
      keys = keys.slice(0, 100);
    }

    const trimmedKeys = keys
      .filter(key => key && typeof key === 'string' && key.trim().length > 0)
      .map(key => key.trim());

    if (trimmedKeys.length === 0) {
      return;
    }

    const start = Date.now();
    try {
      const delPromise = redisClient.del(...trimmedKeys);
      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Cache mdel timeout')), 5000); // 5 second timeout
      });

      await Promise.race([delPromise, timeoutPromise]);
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, false);
      logger.error('Error deleting multiple data from cache:', error);
    }
  }

  /**
   * Get or set data in cache with a function to compute the value if not found
   * @param key Cache key
   * @param compute Function to compute the value if not found
   * @param ttl Time to live in seconds (default: 1 hour)
   * @returns Cached or computed data
   */
  static async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }
    
    const computed = await compute();
    await this.set(key, computed, ttl);
    return computed;
  }

  /**
   * Invalidate cache keys matching a pattern
   * @param pattern Pattern to match keys
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    const start = Date.now();
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      const duration = Date.now() - start;
      recordCacheMetric('invalidatePattern', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('invalidatePattern', duration, false);
      logger.error('Error invalidating cache pattern:', error);
    }
  }

  /**
   * Check if Redis client is connected
   * @returns Boolean indicating if Redis client is connected
   */
  static isConnected(): boolean {
    return redisClient.status === 'ready';
  }

  /**
   * Disconnect Redis client
   */
  static async disconnect(): Promise<void> {
    try {
      await redisClient.quit();
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
}

// Export convenience functions for backward compatibility
export async function getOrSetEnhanced<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  return CacheService.getOrSet(key, fetchFn, ttl);
}

export async function batchGetOrSet<T>(
  items: { key: string; fetchFn: () => Promise<T>; ttl?: number }[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      return CacheService.getOrSet(item.key, item.fetchFn, item.ttl || 3600);
    })
  );
}

// Export default instance for backward compatibility
const cacheService = CacheService;
export default cacheService;