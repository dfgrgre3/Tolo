import * as cache from './cache';

// Explicit re-exports for static analysis and backward compatibility
export const redis = cache.redis;
export const redisClient = cache.redisClient;
export const getRedisClient = cache.getRedisClient;

import { logger } from '@/lib/logger';
import type { Redis } from 'ioredis';

const UnifiedCache = cache.CacheService;

// Legacy RedisClient type for backward compatibility
export type RedisClient = Redis;

class RedisServiceWrapper {
  private _legacyClient: any = null; // Used for backward compatibility sync checks if needed

  async connectRedis() {
    return getRedisClient();
  }

  async init() {
    if (process.env.NODE_ENV !== 'test') {
      await getRedisClient();
    }
  }

  // Delegate all methods to UnifiedCache where possible
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
    const client = await getRedisClient();
    if (!client) return false;
    const res = await client.exists(key);
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
    const client = await getRedisClient();
    if (client) await client.flushall();
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    return UnifiedCache.getOrSet(key, fetchFn, ttl);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    return UnifiedCache.invalidatePattern(pattern);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return UnifiedCache.incrBy(key, amount);
  }

  async getClient() {
    return getRedisClient();
  }

  async isConnected(): Promise<boolean> {
    const client = await getRedisClient();
    return client?.status === 'ready';
  }

  async ensureConnected(): Promise<boolean> {
    const client = await getRedisClient();
    return client?.status === 'ready';
  }
}

const redisService = new RedisServiceWrapper();

// Backward-compatible named export
export const CacheService = redisService;

export default redisService;
