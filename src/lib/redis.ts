import { createClient, Cluster } from 'redis';
import { perfConfig, PerfMonitor } from './perf-config.js';
import { recordCacheMetric } from './db-monitor';

class RedisService {
  private client: any;
  private clusterMode: boolean;

  constructor() {
    this.clusterMode = process.env.REDIS_CLUSTER === 'true';
    
    if (this.clusterMode) {
      this.client = new Cluster([
        { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
      ], {
        scaleReads: 'slave',
        redisOptions: {
          password: process.env.REDIS_PASSWORD
        }
      });
    } else {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
        }
      });
    }

    this.client.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });
  }

  // Connect to Redis
  async connectRedis() {
    try {
      if (this.clusterMode) {
        await this.client.connect();
      } else {
        await this.client.connect();
      }
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  // Initialize Redis connection
  async init() {
    if (process.env.NODE_ENV !== 'test') {
      await this.connectRedis();
    }
  }

  // Simple compression for large objects
  compressData(data: string): string {
    // In a real implementation, you might use a proper compression library
    // For now, we'll just return the data as-is
    return data;
  }

  decompressData(data: string): string {
    // In a real implementation, you would decompress the data
    // For now, we'll just return the data as-is
    return data;
  }

  // Cache service with generic type support
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    try {
      const data = await this.client.get(key);
      const duration = Date.now() - start;
      const hit = data !== null;
      
      // Record cache metric
      recordCacheMetric('get', duration, hit);
      
      if (data) {
        const decompressedData = this.decompressData(data);
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

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const start = Date.now();
    try {
      const serializedValue = JSON.stringify(value);
      const compressedValue = this.compressData(serializedValue);
      
      if (ttl) {
        await this.client.setEx(key, ttl, compressedValue);
      } else {
        await this.client.set(key, compressedValue);
      }
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('set', duration, false);
      console.error('Error setting data in cache:', error);
    }
  }

  async del(key: string): Promise<void> {
    const start = Date.now();
    try {
      await this.client.del(key);
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('del', duration, false);
      console.error('Error deleting data from cache:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Error checking if key exists in cache:', error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const start = Date.now();
    try {
      const results = await this.client.mGet(keys);
      const duration = Date.now() - start;
      // Count hits (non-null values)
      const hitCount = results.filter(r => r !== null).length;
      recordCacheMetric('mget', duration, hitCount > 0);
      
      return results.map(result => {
        if (result) {
          const decompressedData = this.decompressData(result);
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

  async mset<T>(keyValuePairs: Record<string, T>, ttl?: number): Promise<void> {
    const start = Date.now();
    try {
      const pipeline = this.client.multi();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        const compressedValue = this.compressData(serializedValue);
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

  async mdel(keys: string[]): Promise<void> {
    const start = Date.now();
    try {
      if (keys.length === 0) return;
      
      await this.client.del(keys);
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('mdel', duration, false);
      console.error('Error deleting multiple keys from cache:', error);
    }
  }

  async flushAll(): Promise<void> {
    const start = Date.now();
    try {
      await this.client.flushAll();
      const duration = Date.now() - start;
      recordCacheMetric('flushAll', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      recordCacheMetric('flushAll', duration, false);
      console.error('Error flushing cache:', error);
    }
  }

  async getOrSet<T>(
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

  async invalidatePattern(pattern: string): Promise<void> {
    const start = Date.now();
    try {
      // Use SCAN to find keys matching the pattern - safer for production than KEYS command
      const stream = this.client.scanIterator({
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

  // Get the raw Redis client for advanced usage
  getClient() {
    return this.client;
  }
}

// Single instance shared across the app
const redisService = new RedisService();

// Backward-compatible named export expected by legacy imports
export const CacheService = redisService;

// Export the raw Redis client for advanced usage (like rate limiting)
// We need to access the private client property
export const redis = (redisService as any).client;

export default redisService;
