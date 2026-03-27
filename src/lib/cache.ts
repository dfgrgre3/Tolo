// This file must only run on the server - prevent browser bundling
if (typeof window !== 'undefined') {
  throw new Error('cache.ts can only be used on the server');
}

import Redis from 'ioredis';
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

// Create the client with lazyConnect to prevent immediate connection attempts
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  reconnectOnError: () => false,
  enableOfflineQueue: false,
  keepAlive: 1,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (isRedisDisabled || times > 1) return null; // Stop retrying
    return 2000;
  }
});

export const redis = redisClient;

let isRedisAvailable = false;
let redisErrorCount = 0;

if (!isRedisDisabled) {
  redisClient.on('connect', () => {
    redisErrorCount = 0;
    isRedisAvailable = true;
    logger.info('Connected to Redis');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  redisClient.on('error', (err: any) => {
    redisErrorCount++;
    isRedisAvailable = false;
    
    // Only log the first error unless it's not a connection error
    if (redisErrorCount === 1) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        logger.warn('Redis is not available. Falling back to memory cache.');
      } else {
        logger.error('Redis error:', err);
      }
    }
  });
} else {
  isRedisAvailable = false;
}

// --- Core Cache Service ---

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!key?.trim()) return null;
    const trimmedKey = key.trim();
    
    try {
      if (!isRedisAvailable) {
        const item = memoryCache.get(trimmedKey);
        if (item && item.expires > Date.now()) {
          return JSON.parse(item.value) as T;
        }
        memoryCache.delete(trimmedKey);
        return null;
      }

      const data = await redisClient.get(trimmedKey);
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
      
      if (!isRedisAvailable) {
        memoryCache.set(trimmedKey, {
          value: serialized,
          expires: Date.now() + (ttl * 1000)
        });
        return;
      }

      if (ttl > 0) {
        await redisClient.setex(trimmedKey, ttl, serialized);
      } else {
        await redisClient.set(trimmedKey, serialized);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${trimmedKey}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    if (!key?.trim()) return;
    const trimmedKey = key.trim();
    
    try {
      if (!isRedisAvailable) {
        memoryCache.delete(trimmedKey);
        return;
      }
      await redisClient.del(trimmedKey);
    } catch (error) {
      logger.error(`Error deleting cache key ${trimmedKey}:`, error);
    }
  }

  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys?.length) return [];
    try {
      if (!isRedisAvailable) {
        return keys.map(k => {
          const item = memoryCache.get(k.trim());
          if (item && item.expires > Date.now()) return JSON.parse(item.value) as T;
          return null;
        });
      }
      const data = await redisClient.mget(keys.map(k => k.trim()));
      return data.map(item => item ? JSON.parse(item) as T : null);
    } catch (error) {
      logger.error('Error in mget:', error);
      return keys.map(() => null);
    }
  }

  static async mset<T>(keyValuePairs: [string, T][], ttl: number = 3600): Promise<void> {
    if (!keyValuePairs?.length) return;
    try {
      if (!isRedisAvailable) {
        const now = Date.now();
        keyValuePairs.forEach(([k, v]) => {
          memoryCache.set(k.trim(), { value: JSON.stringify(v), expires: now + (ttl * 1000) });
        });
        return;
      }
      const pipeline = redisClient.pipeline();
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
      if (!isRedisAvailable) {
        keys.forEach(k => memoryCache.delete(k.trim()));
        return;
      }
      await redisClient.del(...keys.map(k => k.trim()));
    } catch (error) {
      logger.error('Error in mdel:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (!isRedisAvailable) {
        for (const key of memoryCache.keys()) {
          if (new RegExp(pattern.replace(/\*/g, '.*')).test(key)) {
            memoryCache.delete(key);
          }
        }
        return;
      }

      // Use SCAN instead of KEYS for production safety (non-blocking)
      const stream = redisClient.scanStream({
        match: pattern,
        count: 100 // Process in chunks
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          // Pause stream while deleting to avoid overwhelming Redis
          stream.pause();
          try {
            await redisClient.del(...keys);
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
      if (isRedisAvailable) await redisClient.flushall();
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
