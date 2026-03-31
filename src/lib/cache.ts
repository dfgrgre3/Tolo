import type { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

// --- Types & Config ---

export const CachePrefixes = {
  USER_TASKS: 'tasks',
  USER_SUBJECTS: 'subjects',
  USER_COURSES: 'courses',
  USER_PROGRESS: 'progress',
  USER_PROFILE: 'profile',
  USER_SESSIONS: 'sessions',
  EDUCATIONAL_CONTENT: 'educational',
  ANNOUNCEMENTS: 'announcements',
  USER_ANALYTICS: 'analytics',
};

// --- Redis Client Initialization ---

const memoryCache = new Map<string, { value: string; expires: number }>();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isRedisDisabled = process.env.DISABLE_REDIS === 'true';

// Singleton instance
let _redisClient: Redis | null = null;

/**
 * Lazy-load the Redis client only on the server.
 * This prevents ioredis from being evaluated in browser/edge environments.
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (isRedisDisabled || typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') return null;
  
  if (!_redisClient) {
    try {
      const { default: Redis } = await import('ioredis');
      _redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        reconnectOnError: () => false,
        enableOfflineQueue: false,
        keepAlive: 1,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 1) return null;
          return 2000;
        }
      });

      _redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      _redisClient.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
           // Silent fail as we have memory fallback
        } else {
           logger.error('Redis error:', err);
        }
      });
    } catch (e) {
      logger.error('Failed to initialize Redis client:', e);
      return null;
    }
  }
  return _redisClient;
}

// Export a proxy as 'redisClient' to maintain backward compatibility with existing imports
// but delay the initialization until a property is accessed.
export const redisClient: Redis = new Proxy({} as Redis, {
  get: (target, prop) => {
    throw new Error(`Direct access to redisClient is deprecated. Use getRedisClient() or CacheService. Methods accessed: ${String(prop)}`);
  }
}) as any;

export const redis = redisClient;

// --- Core Cache Service ---

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!key?.trim()) return null;
    const trimmedKey = key.trim();
    
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        const item = memoryCache.get(trimmedKey);
        if (item && item.expires > Date.now()) {
          return JSON.parse(item.value) as T;
        }
        memoryCache.delete(trimmedKey);
        return null;
      }

      const data = await client.get(trimmedKey);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      logger.error(`Error getting cache key ${trimmedKey}:`, error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    if (!key?.trim()) return;
    const trimmedKey = key.trim();
    
    try {
      const serialized = JSON.stringify(value);
      const client = await getRedisClient();
      
      if (!client || client.status !== 'ready') {
        memoryCache.set(trimmedKey, {
          value: serialized,
          expires: Date.now() + (ttl * 1000)
        });
        return;
      }

      if (ttl > 0) {
        await client.setex(trimmedKey, ttl, serialized);
      } else {
        await client.set(trimmedKey, serialized);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${trimmedKey}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    if (!key?.trim()) return;
    const trimmedKey = key.trim();
    
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        memoryCache.delete(trimmedKey);
        return;
      }
      await client.del(trimmedKey);
    } catch (error) {
      logger.error(`Error deleting cache key ${trimmedKey}:`, error);
    }
  }

  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys?.length) return [];
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        return keys.map(k => {
          const item = memoryCache.get(k.trim());
          if (item && item.expires > Date.now()) return JSON.parse(item.value) as T;
          return null;
        });
      }
      const data = await client.mget(keys.map(k => k.trim()));
      return data.map(item => item ? JSON.parse(item) as T : null);
    } catch (error) {
      logger.error('Error in mget:', error);
      return keys.map(() => null);
    }
  }

  static async mset<T>(keyValuePairs: [string, T][], ttl: number = 3600): Promise<void> {
    if (!keyValuePairs?.length) return;
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        const now = Date.now();
        keyValuePairs.forEach(([k, v]) => {
          memoryCache.set(k.trim(), { value: JSON.stringify(v), expires: now + (ttl * 1000) });
        });
        return;
      }
      const pipeline = client.pipeline();
      keyValuePairs.forEach(([k, v]) => {
        pipeline.setex(k.trim(), ttl, JSON.stringify(v));
      });
      await pipeline.exec();
    } catch (error) {
      logger.error('Error in mset:', error);
    }
  }

  static async mdel(keys: string[]): Promise<void> {
    if (!keys?.length) return;
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        keys.forEach(k => memoryCache.delete(k.trim()));
        return;
      }
      await client.del(...keys.map(k => k.trim()));
    } catch (error) {
      logger.error('Error in mdel:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        for (const key of memoryCache.keys()) {
          if (new RegExp(pattern.replace(/\*/g, '.*')).test(key)) {
            memoryCache.delete(key);
          }
        }
        return;
      }

      // Use SCAN instead of KEYS for production safety (non-blocking)
      const stream = client.scanStream({
        match: pattern,
        count: 100 // Process in chunks
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          // Pause stream while deleting to avoid overwhelming Redis
          stream.pause();
          try {
            const currentClient = await getRedisClient();
            if (currentClient) await currentClient.del(...keys);
          } catch (delError) {
            logger.error(`Error deleting keys in pattern ${pattern}:`, delError);
          }
          stream.resume();
        }
      });

      return new Promise((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', (err) => {
          logger.error(`Scan stream error for pattern ${pattern}:`, err);
          reject(err);
        });
      });
    } catch (error) {
      logger.error(`Error invalidating pattern ${pattern}:`, error);
    }
  }

  private static pendingPromises = new Map<string, Promise<any>>();

  /**
   * getOrSet with Cache Stampede prevention
   */
  static async getOrSet<T>(key: string, compute: () => Promise<T>, ttl: number = 3600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    // Check if there is already a pending computation for this key
    const pending = this.pendingPromises.get(key);
    if (pending) return pending as Promise<T>;

    const promise = compute()
      .then(async (result) => {
        await this.set(key, result, ttl);
        this.pendingPromises.delete(key);
        return result;
      })
      .catch((err) => {
        this.pendingPromises.delete(key);
        throw err;
      });

    this.pendingPromises.set(key, promise);
    return promise as Promise<T>;
  }


  static async flushAll(): Promise<void> {
    try {
      const client = await getRedisClient();
      if (client) await client.flushall();
      memoryCache.clear();
      logger.warn('All cache flushed');
    } catch (error) {
      logger.error('Error flushing cache:', error);
    }
  }
}

// --- Educational Helpers ---

export const EducationalCache = {
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    return CacheService.getOrSet(`${CachePrefixes.EDUCATIONAL_CONTENT}:${key}`, fetchFn, ttl);
  },

  async get<T>(key: string): Promise<T | null> {
    return CacheService.get<T>(`${CachePrefixes.EDUCATIONAL_CONTENT}:${key}`);
  },

  async set<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
    await CacheService.set(`${CachePrefixes.EDUCATIONAL_CONTENT}:${key}`, data, ttl);
  },

  async getOrSetSubject(subjectId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
    return this.getOrSet(`subject:${subjectId}`, fetchFn, 600);
  },

  async getOrSetCourse(courseId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
    return this.getOrSet(`course:${courseId}`, fetchFn, 600);
  },

  async getOrSetLesson(lessonId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
    return this.getOrSet(`lesson:${lessonId}`, fetchFn, 600);
  },

  async invalidate(key: string): Promise<void> {
    await CacheService.del(`${CachePrefixes.EDUCATIONAL_CONTENT}:${key}`);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    await CacheService.invalidatePattern(`${CachePrefixes.EDUCATIONAL_CONTENT}:${pattern}`);
  },

  async batchGetOrSet<T>(items: { key: string; fetchFn: () => Promise<T>; ttl?: number }[]): Promise<T[]> {
    return Promise.all(items.map(item => this.getOrSet(item.key, item.fetchFn, item.ttl || 3600)));
  }
};


// --- Invalidation Helpers ---

export const InvalidationService = {
  async invalidateUser(userId: string): Promise<void> {
    await CacheService.invalidatePattern(`*:${userId}:*`);
  },
  
  async invalidateAll(): Promise<void> {
    await CacheService.flushAll();
  }
};

// --- Exports for backward compatibility ---

export const getOrSetEnhanced = CacheService.getOrSet;
export default CacheService;
