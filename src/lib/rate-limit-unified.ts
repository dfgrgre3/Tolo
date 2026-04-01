import { getRedisClient } from '@/lib/cache';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
  lockoutMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  remaining: number;
  resetTime: number;
  lockedUntil?: number;
}

/**
 * Unified Distributed Rate Limiter (Hybrid Architecture)
 * L1: Local Memory Cache (3s) - Blazing fast burst protection
 * L2: Redis Multi-Tenant Sliding Window - Shared across instances
 * 
 * Performance: Optimized for 1 RTT per check (if not cached locally).
 */
export class RateLimitManager {
  private static instance: RateLimitManager;
  private localCache = new Map<string, { result: RateLimitResult; timestamp: number }>();
  private readonly LOCAL_CACHE_TTL = 3000; // 3 seconds
  private readonly MAX_CACHE_SIZE = 5000; 

  private constructor() {}

  public static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Optimized check function (Sliding Window + Atomic Operations)
   */
  async check(identifier: string, config: RateLimitConfig & { failClosed?: boolean }): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // 1. Generate Key (Fast Hashing)
      let hashedId = identifier;
      if (identifier.includes('/') || identifier.length > 48) {
         try {
            const msgUint8 = new TextEncoder().encode(identifier);
            if (typeof crypto !== 'undefined' && crypto.subtle) {
               const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
               hashedId = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
            } else {
               hashedId = Buffer.from(identifier).toString('base64').substring(0, 24);
            }
         } catch {
            hashedId = identifier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
         }
      }

      const key = `rl:${config.keyPrefix}:${hashedId}`;
      const lockoutKey = `lockout:${config.keyPrefix}:${hashedId}`;

      // 2. HYBRID CACHE (L1): Instant local bypass
      const cached = this.localCache.get(key);
      if (cached && now - cached.timestamp < this.LOCAL_CACHE_TTL) {
         const result = { ...cached.result };
         if (result.allowed) {
            result.attempts++;
            result.remaining = Math.max(0, result.remaining - 1);
         }
         return result;
      }
      
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        if (config.failClosed) return { allowed: false, attempts: 999, remaining: 0, resetTime: now + 60000 };
        // FAIL OPEN in development if Redis is not ready
        return { allowed: true, attempts: 0, remaining: config.maxAttempts, resetTime: now + 60000 };
      }

      // 3. ATOMIC OPERATION (L2): Combine Lockout + RateLimit into 1 RTT
      const pipeline = client.multi()
        .get(lockoutKey)
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, `${now}-${Math.random()}`)
        .zcard(key)
        .expire(key, Math.ceil(config.windowMs / 1000) * 2);

      const results = await pipeline.exec();
      if (!results || !Array.isArray(results)) throw new Error('Redis pipeline failed');

      // Index Mapping: [0] GET lockout, [1] ZREMRANGE, [2] ZADD, [3] ZCARD
      const lockedUntilStr = (results[0] as any)[1] as string | null;
      const currentCount = (results[3] as any)[1] as number;

      // Check Lockout
      if (lockedUntilStr) {
        const lockedUntil = parseInt(lockedUntilStr, 10);
        if (now < lockedUntil) {
          const res = { allowed: false, attempts: config.maxAttempts, remaining: 0, resetTime: lockedUntil, lockedUntil };
          this.addToLocalCache(key, res);
          return res;
        }
      }

      const allowed = currentCount <= config.maxAttempts;
      const result: RateLimitResult = {
        allowed,
        attempts: currentCount,
        remaining: Math.max(0, config.maxAttempts - currentCount),
        resetTime: now + config.windowMs
      };

      // 4. Handle Lockout Trigger (Secondary Write if failed)
      if (!allowed && config.lockoutMs) {
        const lockedUntil = now + config.lockoutMs;
        await client.setex(lockoutKey, Math.ceil(config.lockoutMs / 1000), lockedUntil.toString());
        result.lockedUntil = lockedUntil;
        result.resetTime = lockedUntil;
      }

      this.addToLocalCache(key, result);
      return result;

    } catch (error) {
      logger.error(`RateLimit Critical Error [${config.keyPrefix}]:`, error);
      if (config.failClosed) return { allowed: false, attempts: 999, remaining: 0, resetTime: now + 30000 };
      return { allowed: true, attempts: 0, remaining: 1, resetTime: 0 };
    }
  }

  private addToLocalCache(key: string, result: RateLimitResult) {
    if (this.localCache.size >= this.MAX_CACHE_SIZE) {
       const keys = Array.from(this.localCache.keys()).slice(0, 1000);
       keys.forEach(k => this.localCache.delete(k));
    }
    this.localCache.set(key, { result, timestamp: Date.now() });
  }

  async checkFast(identifier: string, limit: number, windowSec: number, failClosed: boolean = false): Promise<boolean> {
    const key = `rl:fast:${identifier}`;
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') return !failClosed;
      const results = await client.multi().incr(key).expire(key, windowSec, 'NX').exec() as any;
      return (results[0][1] as number) <= limit;
    } catch { return !failClosed; }
  }
}

export const authRateLimiter = {
  check: (id: string, path: string = '') => RateLimitManager.getInstance().check(`${id}:${path}`, {
    keyPrefix: 'auth:v3',
    windowMs: 15 * 60 * 1000,
    maxAttempts: process.env.NODE_ENV === 'production' ? 5 : 200,
    lockoutMs: 60 * 60 * 1000,
    failClosed: process.env.NODE_ENV === 'production'
  })
};

export const apiRateLimiter = {
  check: (id: string, path: string) => RateLimitManager.getInstance().check(`${id}:${path}`, {
    keyPrefix: 'api:v3',
    windowMs: 60 * 1000,
    maxAttempts: process.env.NODE_ENV === 'production' ? 100 : 3000,
    failClosed: false
  })
};

export const globalRateLimiter = RateLimitManager.getInstance();
