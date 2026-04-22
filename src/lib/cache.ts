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
  API_RESPONSE: 'api_v1',
  RATE_LIMIT: 'rl'
} as const;

export type CachePrefix = (typeof CachePrefixes)[keyof typeof CachePrefixes];

// --- Redis Client Initialization ---

const MAX_MEMORY_ITEMS = 5000;
const memoryCache = new Map<string, {value: string;expires: number;}>();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isRedisDisabled = process.env.DISABLE_REDIS === 'true';

// Singleton instance
const globalForRedis = globalThis as unknown as {_redisClient?: Redis | null;};
let _redisClient: Redis | null = globalForRedis._redisClient || null;

// Track pending ready-state promises to avoid duplicate listeners
const readyStatePromises = new WeakMap<Redis, Promise<Redis | null>>();

async function ensureRedisReady(client: Redis | null): Promise<Redis | null> {
  if (!client) return null;

  const status = client.status;
  if (status === 'ready') return client;

  // If we're already waiting for this specific client to be ready, reuse the promise
  const existingPromise = readyStatePromises.get(client);
  if (existingPromise) return existingPromise;

  const waitPromise = (async () => {
    try {
      // If already connecting, wait for it
      if (status === 'connecting' || status === 'reconnecting') {
        return await new Promise<Redis | null>((resolve) => {
          let resolved = false;

          const onReady = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(client);
          };

          const onError = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(null);
          };

          const cleanup = () => {
            client.off('ready', onReady);
            client.off('error', onError);
          };

          client.once('ready', onReady);
          client.once('error', onError);

          // Safety timeout: 2s (Increased for better availability/fail-over speed)
          setTimeout(() => {
            if (resolved) return;
            resolved = true;
            cleanup();
            if (client.status === 'ready') {
              resolve(client);
            } else {
              logger.warn(`[CacheService] Redis ready check timed out in status: ${client.status}`);
              resolve(null);
            }
          }, 2000);
        });
      }

      // If in 'wait' status (lazyConnect not yet called), try to connect
      if (status === 'wait') {
        try {
          await client.connect();
          return client.status === 'ready' ? client : null;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (!msg.includes('already connected') && !msg.includes('Connecting is in progress')) {
            logger.warn(`[CacheService] Redis manual connect failed: ${msg}`);
          }
          return client.status === 'ready' ? client : null;
        }
      }

      // For 'close' or 'end' states, ioredis handles reconnection automatically
      // via retryStrategy. Don't attempt manual reconnect to avoid race conditions.
      if (status === 'close' || status === 'end') {
        return null;
      }

      return client.status === 'ready' ? client : null;
    } finally {
      readyStatePromises.delete(client);
    }
  })();

  readyStatePromises.set(client, waitPromise);
  return waitPromise;
}

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
        maxRetriesPerRequest: null,
        connectTimeout: 5000, // Increased for cross-continental stability (Egypt -> US-East)
        family: 4, // Force IPv4 for faster DNS/Connection resolution
        keepAlive: 10000,
        noDelay: true, // Disable Nagle's algorithm for lower latency
        lazyConnect: true,
        retryStrategy: (times) => {
          return Math.min(times * 300, 10000); // Max 10s between retries (increased for better recovery)
        }
      });

      // Increase max listeners to prevent warnings during high load or rapid reconnects
      _redisClient.setMaxListeners(50);

      _redisClient.on('connect', () => {
        logger.info('Connected to Redis');
        // Note: maxmemory-policy should be configured at the Redis server level.
        // Managed Redis services (Upstash, Railway, etc.) don't support CONFIG SET.
        // Ensure your Redis provider is configured with 'noeviction' policy.
      });

      _redisClient.on('error', (err: {code?: string;message?: string;}) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {

          // Silent fail as we have memory fallback
        } else {logger.error('Redis error:', err);
        }
      });
      if (process.env.NODE_ENV !== 'production') {
        globalForRedis._redisClient = _redisClient;
      }
    } catch (err) {
      logger.error('Failed to initialize Redis client:', err);
      return null;
    }
  }
  return ensureRedisReady(_redisClient);
}

// Export a proxy as 'redisClient' to maintain backward compatibility with existing imports
// but delay the initialization until a property is accessed.
export const redisClient = new Proxy({} as Redis, {
  get: (_, prop) => {
    throw new Error(`Direct access to redisClient is deprecated. Use getRedisClient() or CacheService. Methods accessed: ${String(prop)}`);
  }
});

export const redis = redisClient;

import { redisCircuitBreaker } from './circuit-breaker';
import { trackCache } from '@/lib/metrics/prometheus';

export class CacheService {
  /**
   * Safe Redis operation wrapper with circuit breaker protection
   */
  private static async safeRedisOp<T>(op: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
    try {
      return await redisCircuitBreaker.execute(async () => {
        const client = await getRedisClient();
        if (!client || client.status !== 'ready') throw new Error('Redis not ready');
        return await op(client);
      });
    } catch (error) {
      // Only log as error for unexpected failures; transient Redis unavailability 
      // is expected and handled by the memory cache fallback
      if (error instanceof Error) {
        const msg = error.message;
        const isExpectedTransient =
        msg.includes('circuit OPEN') ||
        msg.includes('Redis not ready') ||
        msg.includes('Operation timed out') || // CircuitBreaker timeout
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('Connection is closed');
        if (!isExpectedTransient) {
          logger.error(`[CacheService] Redis operation failed:`, error);
        }
        // Expected transient states are silently handled â€” memory cache is the fallback
      } else {
        logger.error(`[CacheService] Redis operation failed:`, error);
      }
      return fallback;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!key?.trim()) return null;
    const trimmedKey = key.trim();

    // Tier 1: In-Memory (Sub-millisecond access)
    const l1Item = memoryCache.get(trimmedKey);
    if (l1Item && l1Item.expires > Date.now()) {
      trackCache('memory_l1', true);
      try {
        return JSON.parse(l1Item.value) as T;
      } catch (_e) {
        memoryCache.delete(trimmedKey);
        return null;
      }
    }

    // Tier 2: Redis with Circuit Breaker
    const data = await this.safeRedisOp(async (client) => {
      return await client.get(trimmedKey);
    }, null);

    if (data) {
      trackCache('redis_l2', true);
      try {
        const parsed = JSON.parse(data) as T;
        // Promote to L1
        this.setL1(trimmedKey, data, 5);
        return parsed;
      } catch (_e) {
        logger.error(`[CacheService] JSON parse error for key ${trimmedKey}`);
        return null;
      }
    }

    trackCache('redis_l2', false);
    return null;
  }

  private static setL1(key: string, serializedValue: string, ttlSeconds: number) {
    if (memoryCache.size >= MAX_MEMORY_ITEMS) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey) memoryCache.delete(firstKey);
    }

    memoryCache.set(key, {
      value: serializedValue,
      expires: Date.now() + ttlSeconds * 1000
    });
  }

  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    if (!key?.trim()) return;
    const trimmedKey = key.trim();

    try {
      const serialized = JSON.stringify(value);

      // Update L1
      this.setL1(trimmedKey, serialized, Math.min(ttl, 10)); // Max 10s for L1

      // Update Redis safely
      await this.safeRedisOp(async (client) => {
        if (ttl > 0) {
          await client.setex(trimmedKey, ttl, serialized);
        } else {
          await client.set(trimmedKey, serialized);
        }
        return true;
      }, false);
    } catch (error) {
      logger.error(`[CacheService] Error setting key ${trimmedKey}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    if (!key?.trim()) return;
    const trimmedKey = key.trim();

    // Always clear L1
    memoryCache.delete(trimmedKey);

    // Clear Redis safely
    await this.safeRedisOp(async (client) => {
      await client.del(trimmedKey);
      return true;
    }, false);
  }

  static async incrBy(key: string, amount: number): Promise<number> {
    if (!key?.trim()) return 0;
    const trimmedKey = key.trim();

    return await this.safeRedisOp(async (client) => {
      return await client.incrby(trimmedKey, amount);
    }, 0);
  }

  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys?.length) return [];

    const results = await this.safeRedisOp(async (client) => {
      return await client.mget(keys.map((k) => k.trim()));
    }, keys.map(() => null as string | null));

    return results.map((item) => {
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch (_e) {
        return null;
      }
    });
  }

  static async mset<T>(keyValuePairs: [string, T][], ttl: number = 3600): Promise<void> {
    if (!keyValuePairs?.length) return;

    await this.safeRedisOp(async (client) => {
      const pipeline = client.pipeline();
      keyValuePairs.forEach(([k, v]) => {
        const trimmedK = k.trim();
        const serialized = JSON.stringify(v);
        pipeline.setex(trimmedK, ttl, serialized);
        this.setL1(trimmedK, serialized, Math.min(ttl, 10));
      });
      await pipeline.exec();
      return true;
    }, false);
  }

  static async mdel(keys: string[]): Promise<void> {
    if (!keys?.length) return;

    keys.forEach((k) => memoryCache.delete(k.trim()));

    await this.safeRedisOp(async (client) => {
      await client.del(...keys.map((k) => k.trim()));
      return true;
    }, false);
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();

      // Memory cache invalidation
      const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of memoryCache.keys()) {
        if (regexPattern.test(key)) {
          memoryCache.delete(key);
        }
      }

      if (!client || client.status !== 'ready' || redisCircuitBreaker.getState() === 'OPEN') {
        return;
      }

      // Use SCAN safely
      const stream = client.scanStream({
        match: pattern,
        count: 500
      });

      return new Promise((resolve) => {
        // Safety timeout for scan stream: 10s
        const safetyTimeout = setTimeout(() => {
          logger.warn(`Scan stream for pattern ${pattern} timed out`);
          resolve();
        }, 10000);

        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            stream.pause();
            try {
              await this.safeRedisOp(async (c) => {
                await c.del(...keys);
                return true;
              }, false);
            } catch (delError) {
              logger.error(`Error deleting keys in pattern ${pattern}:`, delError);
            }
            stream.resume();
          }
        });

        stream.on('end', () => {
          clearTimeout(safetyTimeout);
          resolve();
        });
        stream.on('error', (err) => {
          clearTimeout(safetyTimeout);
          logger.error(`Scan stream error for pattern ${pattern}:`, err);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error invalidating pattern ${pattern}:`, error);
    }
  }

  private static pendingPromises = new Map<string, Promise<unknown>>();

  /**
   * getOrSet with Cache Stampede prevention
   */
  static async getOrSet<T>(key: string, compute: () => Promise<T>, ttl: number = 3600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    // Stampede prevention
    const pending = this.pendingPromises.get(key);
    if (pending) return pending as Promise<T>;

    // Execution with timeout
    const computeWithTimeout = async (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Cache compute timed out for key: ${key}`));
        }, 10000); // 10s timeout for the fetch/compute operation

        compute().
        then((res) => {
          clearTimeout(timeout);
          resolve(res);
        }).
        catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    };

    const promise = computeWithTimeout().
    then(async (result) => {
      await this.set(key, result, ttl);
      return result;
    }).
    finally(() => {
      this.pendingPromises.delete(key);
    });

    this.pendingPromises.set(key, promise);
    return promise as Promise<T>;
  }

  static async flushAll(): Promise<void> {
    memoryCache.clear();
    await this.safeRedisOp(async (client) => {
      await client.flushall();
      return true;
    }, false);
    logger.warn('All cache flushed');
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

  async batchGetOrSet<T>(items: {key: string;fetchFn: () => Promise<T>;ttl?: number;}[]): Promise<T[]> {
    return Promise.all(items.map((item) => this.getOrSet(item.key, item.fetchFn, item.ttl || 3600)));
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