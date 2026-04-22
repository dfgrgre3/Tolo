import { getRedisClient } from './cache';
import { logger } from './logger';

export interface RateLimitConfig {
  points: number;      // Credits (request count allowed)
  duration: number;    // Window size in seconds
  keyPrefix: string;
}

export class DistributedRateLimiter {
  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request is allowed. Returns metadata.
   */
  async check(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `ratelimit:${this.config.keyPrefix}:${identifier}`;
    
    try {
      const client = await getRedisClient();
      if (!client) {
         return { allowed: true, remaining: 1, resetTime: 0 };
      }

      const results = await client
        .pipeline()
        .incr(key)
        .expire(key, this.config.duration, 'NX') // Set TTL only if not exists
        .ttl(key)
        .exec();

      if (!results) throw new Error('Redis pipeline failed');

      const count = results[0][1] as number;
      const ttl = results[2][1] as number;

      const remaining = Math.max(0, this.config.points - count);
      const allowed = count <= this.config.points;

      return {
        allowed,
        remaining,
        resetTime: Date.now() + (ttl * 1000),
      };
    } catch (error) {
      logger.error(`Rate limiter failure for ${identifier}:`, error);
      // Fail open in case of Redis failure to maintain availability (Circuit Breaker logic)
      return { allowed: true, remaining: 1, resetTime: 0 };
    }
  }
}

// Pre-defined limiters
export const apiRateLimiter = new DistributedRateLimiter({
  points: 100,      // 100 requests
  duration: 60,     // per minute
  keyPrefix: 'api_generic',
});

export const authRateLimiter = new DistributedRateLimiter({
  points: 5,        // 5 attempts
  duration: 600,    // per 10 minutes
  keyPrefix: 'auth_attempts',
});
