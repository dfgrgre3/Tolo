import Redis from 'ioredis';
import { perfConfig, PerfMonitor } from './perf-config';
import { recordCacheMetric } from './db-monitor';

// Create Redis client with enhanced configuration for better performance and reliability
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  retryDelayOnClusterDown: 100,
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
        await redisClient.setex(key, ttl, compressedValue);
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
   * Get multiple values from cache
   * @param keys Cache keys
   * @returns Array of cached data in the same order as keys
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const start = Date.now();
    try {
      const data = await redisClient.mget(keys);
      const duration = Date.now() - start;
      recordCacheMetric('mget', duration, true);
      
      return data.map(item => {
        if (item) {
          const decompressedData = decompressData(item);
          return JSON.parse(decompressedData) as T;
        }
        return null;
      });
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mget', duration, false);
      console.error('Error getting multiple data from cache:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   * @param keyValuePairs Array of [key, value] pairs
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async mset<T>(keyValuePairs: [string, T][], ttl: number = 3600): Promise<void> {
    const start = Date.now();
    try {
      const serializedPairs = keyValuePairs.map(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        const compressedValue = compressData(serializedValue);
        return [key, compressedValue] as [string, string];
      });
      
      if (ttl) {
        const pipeline = redisClient.pipeline();
        serializedPairs.forEach(([key, value]) => {
          pipeline.setex(key, ttl, value);
        });
        await pipeline.exec();
      } else {
        await redisClient.mset(serializedPairs);
      }
      
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mset', duration, false);
      console.error('Error setting multiple data in cache:', error);
    }
  }

  /**
   * Delete multiple keys from cache
   * @param keys Cache keys
   */
  static async mdel(keys: string[]): Promise<void> {
    const start = Date.now();
    try {
      await redisClient.del(...keys);
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, false);
      console.error('Error deleting multiple data from cache:', error);
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
      console.error('Error invalidating cache pattern:', error);
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
      console.error('Error disconnecting from Redis:', error);
    }
  }
}