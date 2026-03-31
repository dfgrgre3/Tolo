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
 * Unified Distributed Rate Limiter (Sliding Window via Redis ZSET)
 * Optimized for 1M+ users with fail-open and timeout protection.
 */
export class RateLimitManager {
  private static instance: RateLimitManager;
  
  private constructor() {}

  public static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Core check function using Sliding Window algorithm.
   */
  async check(identifier: string, config: RateLimitConfig & { failClosed?: boolean }): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // SECURITY: Use SHA-256 for identifiers with paths to prevent Keyspace Explosion attacks
      let hashedId = identifier;
      if (identifier.includes('/') || identifier.length > 64) {
         const msgUint8 = new TextEncoder().encode(identifier);
         const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
         const hashArray = Array.from(new Uint8Array(hashBuffer));
         hashedId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      }

      const key = `rl:${config.keyPrefix}:${hashedId}`;
      const lockoutKey = `lockout:${config.keyPrefix}:${hashedId}`;
      
      const client = await getRedisClient();
      
      // FAIL STRATEGY: Auth should fail closed, general API can fail open.
      if (!client || client.status !== 'ready') {
        if (config.failClosed) {
          logger.error(`[RateLimit] Redis UNAVAILABLE - Blocking sensitive action (Fail-Closed) for ${config.keyPrefix}`);
          return { allowed: false, attempts: 999, remaining: 0, resetTime: now + 60000 };
        }
        return { allowed: true, attempts: 0, remaining: config.maxAttempts, resetTime: 0 };
      }

      // 1. Check for active Lockout
      const lockedUntilStr = await client.get(lockoutKey);
      if (lockedUntilStr) {
        const lockedUntil = parseInt(lockedUntilStr, 10);
        if (now < lockedUntil) {
          return {
            allowed: false,
            attempts: config.maxAttempts,
            remaining: 0,
            resetTime: lockedUntil,
            lockedUntil
          };
        }
      }

      // 2. Sliding Window Logic using ZSET
      // Atomic pipeline to prune old entries and get current count
      const results = await client.multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, `${now}-${Math.random()}`) // Unique member
        .zcard(key)
        .expire(key, Math.ceil(config.windowMs / 1000) * 2) // Cache TTL > window
        .exec();

      if (!results || !Array.isArray(results)) throw new Error('Redis pipeline failed');

      const currentCount = results[2][1] as number;
      const allowed = currentCount <= config.maxAttempts;

      // 3. Handle Lockout Trigger
      if (!allowed && config.lockoutMs) {
        const lockedUntil = now + config.lockoutMs;
        await client.setex(lockoutKey, Math.ceil(config.lockoutMs / 1000), lockedUntil.toString());
        return {
          allowed: false,
          attempts: currentCount,
          remaining: 0,
          resetTime: lockedUntil,
          lockedUntil
        };
      }

      return {
        allowed,
        attempts: currentCount,
        remaining: Math.max(0, config.maxAttempts - currentCount),
        resetTime: now + config.windowMs
      };

    } catch (error) {
      logger.error(`RateLimit Error [${config.keyPrefix}]:`, error);
      // Fail Strategy on Unexpected Error
      if (config.failClosed) return { allowed: false, attempts: 999, remaining: 0, resetTime: now + 30000 };
      return { allowed: true, attempts: 0, remaining: 1, resetTime: 0 };
    }
  }

  /**
   * Specialized check for high-frequency API routes (Middleware)
   * Uses simpler INCR logic for better performance.
   */
  async checkFast(identifier: string, limit: number, windowSec: number, failClosed: boolean = false): Promise<boolean> {
    const key = `rl:fast:${identifier}`;
    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') return !failClosed;

      const [count] = await client.multi()
        .incr(key)
        .expire(key, windowSec, 'NX')
        .exec() as any;

      return (count[1] as number) <= limit;
    } catch {
      return !failClosed;
    }
  }
}

// Export singletons for specific concerns
export const authRateLimiter = {
  check: (id: string, path: string = '') => RateLimitManager.getInstance().check(`${id}:${path}`, {
    keyPrefix: 'auth:v2',
    windowMs: 15 * 60 * 1000, // 15 mins
    maxAttempts: process.env.NODE_ENV === 'production' ? 5 : 50, // More lenient in dev
    lockoutMs: 60 * 60 * 1000, // 1 hour lockout
    failClosed: process.env.NODE_ENV === 'production' // SECURITY: Auth must fail safe (blocked) if Redis is down, but not in dev
  })
};

export const apiRateLimiter = {
  check: (id: string, path: string) => RateLimitManager.getInstance().check(`${id}:${path}`, {
    keyPrefix: 'api:v2',
    windowMs: 60 * 1000,      // 1 min
    maxAttempts: process.env.NODE_ENV === 'production' ? 100 : 1000,         // 100 reqs/min in prod, high in dev
    failClosed: false         // General API can fail open to maintain availability
  })
};

export const globalRateLimiter = RateLimitManager.getInstance();
