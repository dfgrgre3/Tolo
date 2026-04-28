import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client instance (lazy connect)
const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
});

redisClient.on('error', (error) => {
    logger.error('[Redis] Connection error:', error);
});

redisClient.on('connect', () => {
    logger.info('[Redis] Connected successfully');
});

export function getRedisClient(): Redis {
    return redisClient;
}

async function closeRedisClient(): Promise<void> {
    await redisClient.quit();
}

// Cache service wrapper for compatibility
const CacheService = {
    async get<T = any>(key: string): Promise<T | null> {
        try {
            const client = getRedisClient();
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`[CacheService] Get error for key ${key}:`, error);
            return null;
        }
    },

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            const client = getRedisClient();
            const stringValue = JSON.stringify(value);
            if (ttlSeconds) {
                await client.setex(key, ttlSeconds, stringValue);
            } else {
                await client.set(key, stringValue);
            }
        } catch (error) {
            logger.error(`[CacheService] Set error for key ${key}:`, error);
        }
    },

    async del(key: string): Promise<void> {
        try {
            const client = getRedisClient();
            await client.del(key);
        } catch (error) {
            logger.error(`[CacheService] Delete error for key ${key}:`, error);
        }
    },

    async mdel(keys: string[]): Promise<void> {
        if (!keys.length) return;
        try {
            const client = getRedisClient();
            await client.del(...keys);
        } catch (error) {
            logger.error(`[CacheService] MDelete error for keys:`, error);
        }
    },

    async invalidate(key: string): Promise<void> {
        return this.del(key);
    },

    async invalidatePattern(pattern: string): Promise<void> {
        try {
            const client = getRedisClient();
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(...keys);
            }
        } catch (error) {
            logger.error(`[CacheService] Invalidate pattern error for ${pattern}:`, error);
        }
    },

    async flushAll(): Promise<void> {
        try {
            const client = getRedisClient();
            await client.flushall();
        } catch (error) {
            logger.error('[CacheService] FlushAll error:', error);
        }
    },

    async getOrSet<T = any>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }
        const value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
    },
};

enum CachePrefixes {
  USER_PROFILE = 'user:profile',
  USER_ANALYTICS = 'user:analytics',
  EDUCATIONAL_CONTENT = 'educational',
  ANNOUNCEMENTS = 'announcements',
  AUTH_SESSION = 'auth:session',
}

