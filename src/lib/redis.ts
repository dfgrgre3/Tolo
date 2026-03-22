// This file is now a unified wrapper around ioredis to prevent dependency redundancy
import { redisClient as ioredis, CacheService as UnifiedCache } from './cache';
import { logger } from '@/lib/logger';

// Re-export the raw client for advanced usage (e.g. rate limiting)
export const redis = ioredis;

// Legacy RedisClient type for backward compatibility
export type RedisClient = typeof ioredis;

class RedisServiceWrapper {
  private client = ioredis;

  constructor() {
    // Connection handling is managed in cache-service-unified.ts
  }

  async connectRedis() {
    // ioredis handles connection automatically, but we keep this for compat
    if (this.client.status === 'ready') return;
    try {
      await this.client.connect();
    } catch (e) {
      if ((e as any).message !== 'Redis is already connecting/connected') {
        logger.error('Failed to connect to Redis:', e);
      }
    }
  }

  async init() {
    if (process.env.NODE_ENV !== 'test') {
      await this.connectRedis();
    }
  }

  // Delegate all methods to UnifiedCache where possible or implement shim
  async get<T>(key: string): Promise<T | null> {
    return UnifiedCache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    return UnifiedCache.set<T>(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    return UnifiedCache.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.client.exists(key);
    return res > 0;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return UnifiedCache.mget<T>(keys);
  }

  async mset<T>(keyValuePairs: Record<string, T>, ttl?: number): Promise<void> {
    const pairs = Object.entries(keyValuePairs) as [string, T][];
    return UnifiedCache.mset(pairs, ttl);
  }

  async mdel(keys: string[]): Promise<void> {
    return UnifiedCache.mdel(keys);
  }

  async flushAll(): Promise<void> {
    await this.client.flushall();
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    return UnifiedCache.getOrSet(key, fetchFn, ttl);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    return UnifiedCache.invalidatePattern(pattern);
  }

  getClient() {
    return this.client;
  }

  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  async ensureConnected(): Promise<boolean> {
    if (this.isConnected()) return true;
    await this.connectRedis();
    return this.isConnected();
  }
}

const redisService = new RedisServiceWrapper();

// Backward-compatible named export
export const CacheService = redisService;

// Export getRedisClient function
export async function getRedisClient() {
  await redisService.ensureConnected();
  return redisService.getClient();
}

export default redisService;
