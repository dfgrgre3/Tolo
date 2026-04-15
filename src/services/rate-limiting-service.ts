import { redis, getRedisClient } from '@/lib/cache';
import type { RedisClient } from '@/lib/redis';
import { redisCircuitBreaker } from '@/lib/circuit-breaker';

import { logger } from '@/lib/logger';
import { RateLimitConfig, RateLimitResult, RateLimitService } from '@/types/services';

export class RateLimitingService implements RateLimitService {
  private externalClient: RedisClient | null;
  private defaultConfig: RateLimitConfig;

  constructor(
    redisClient: RedisClient | null = null,
    defaultConfig: RateLimitConfig = {
      windowMs: 10 * 60 * 1000, // 10 minutes (stricter)
      maxAttempts: 3, // Reduced from 5 for better security
      lockoutMs: 60 * 60 * 1000, // 60 minutes (progressive lockout)
      failClosed: false // Default to fail-open (Availability prioritized)
    }
  ) {
    this.externalClient = redisClient;
    this.defaultConfig = defaultConfig;
  }

  private async getClient(): Promise<RedisClient | null> {
    if (this.externalClient) return this.externalClient;
    // Don't even try if circuit is open to avoid 1s+ timeouts
    if (redisCircuitBreaker.getState() === 'OPEN') return null;
    return getRedisClient();
  }

  /**
   * Check if a client has exceeded rate limits
   * @param clientId Unique identifier for the client (e.g., IP + User Agent)
   * @param config Rate limiting configuration
   * @returns RateLimitResult indicating if the request is allowed
   */
  async checkRateLimit(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<RateLimitResult> {
    // Validate inputs
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      // logger.warn('Invalid clientId provided to checkRateLimit');
      return { allowed: true, attempts: 0 };
    }

    if (!config || typeof config !== 'object') {
      // logger.warn('Invalid config provided to checkRateLimit, using default');
      config = this.defaultConfig;
    }

    // 1. Sanitize and validate logic
    const trimmedClientId = clientId.trim().slice(0, 200); // Limit length
    const validWindowMs = Math.max(1000, Math.min(config.windowMs || this.defaultConfig.windowMs, 3600000)); // 1s to 1h
    const validMaxAttempts = Math.max(1, Math.min(config.maxAttempts || this.defaultConfig.maxAttempts, 1000)); // 1 to 1000
    const validLockoutMs = config.lockoutMs ? Math.max(1000, Math.min(config.lockoutMs, 86400000)) : undefined; // 1s to 24h

    const client = await this.getClient();
    // Fail strategy based on config
    if (!client) {
      if (config.failClosed) {
        logger.error(`[RateLimitingService] FAIL-CLOSED: Redis down, blocking request for ${trimmedClientId} for security.`);
        return { allowed: false, attempts: validMaxAttempts, remainingTime: 15 };
      }
      return { allowed: true, attempts: 0 };
    }

    const key = `rate_limit:${trimmedClientId}`;
    const lockoutKey = `lockout:${trimmedClientId}`;

    const now = Date.now();
    const windowStart = now - validWindowMs;

    try {
      // Check if account is locked with timeout
      const getLockPromise = client.get(lockoutKey);
      const lockTimeoutPromise = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), 1000); // 1 second timeout
      });

      const lockedUntil = await Promise.race([getLockPromise, lockTimeoutPromise]);
      if (lockedUntil) {
        const lockoutTime = parseInt(lockedUntil, 10);
        if (!isNaN(lockoutTime) && now < lockoutTime) {
          const remainingTime = Math.ceil((lockoutTime - now) / 60000); // in minutes
          return {
            allowed: false,
            attempts: validMaxAttempts,
            remainingTime,
            lockedUntil: lockoutTime
          };
        } else {
          // Lockout expired, remove the lockout key (non-blocking)
          client.del(lockoutKey).catch(() => { });
        }
      }

      // Use Redis pipeline for atomic operations with timeout
      const pipeline = client.multi();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Get current count
      pipeline.zcard(key);

      const execPromise = pipeline.exec();
      const execTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Redis pipeline timeout'));
        }, 1500); // 1.5 second timeout
      });

      const results = await Promise.race([execPromise, execTimeoutPromise]);
      const currentCount = (results && results[1] && typeof results[1] === 'number') ? results[1] : 0;

      return {
        allowed: currentCount < validMaxAttempts,
        attempts: currentCount,
        remainingTime: undefined
      };
    } catch (error) {
      // Only log critical Redis errors, ignore timeouts/connection issues to reduce noise
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('timeout') && !errorMessage.includes('connection')) {
        logger.warn('Rate limiting check failed (failing open):', errorMessage);
      }

      // Fail strategy based on config during execution error
      if (config.failClosed) {
        return { allowed: false, attempts: validMaxAttempts, remainingTime: 15 };
      }
      
      // Fail open - don't block requests if rate limiting fails
      return {
        allowed: true,
        attempts: 0
      };
    }
  }

  /**
   * Record a failed attempt and update rate limiting data
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   */
  async recordFailedAttempt(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<void> {
    // Validate inputs
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      return;
    }

    const client = await this.getClient();
    // Fail silently if Redis client is not available
    if (!client) {
      return;
    }

    if (!config || typeof config !== 'object') {
      config = this.defaultConfig;
    }

    // Validate config values
    const validWindowMs = Math.max(1000, Math.min(config.windowMs || this.defaultConfig.windowMs, 3600000)); // 1s to 1h
    const validMaxAttempts = Math.max(1, Math.min(config.maxAttempts || this.defaultConfig.maxAttempts, 1000)); // 1 to 1000
    const validLockoutMs = config.lockoutMs ? Math.max(1000, Math.min(config.lockoutMs, 86400000)) : undefined; // 1s to 24h

    const trimmedClientId = clientId.trim().slice(0, 200); // Limit length
    const key = `rate_limit:${trimmedClientId}`;
    const lockoutKey = `lockout:${trimmedClientId}`;

    const now = Date.now();

    try {
      // Use Redis pipeline for atomic operations with timeout
      const pipeline = client.multi();

      // Add current attempt
      pipeline.zadd(key, now, now.toString());

      // Set expiration for the sorted set
      pipeline.expire(key, Math.ceil(validWindowMs / 1000));

      const execPromise = pipeline.exec();
      const execTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Redis pipeline timeout'));
        }, 1500); // 1.5 second timeout
      });

      await Promise.race([execPromise, execTimeoutPromise]);

      // Check if we need to lock the account (non-blocking)
      // We don't await this to avoid blocking the response
      this.checkRateLimit(trimmedClientId, { ...config, windowMs: validWindowMs, maxAttempts: validMaxAttempts, lockoutMs: validLockoutMs })
        .then((result) => {
          if (result.attempts >= validMaxAttempts && validLockoutMs) {
            // Lock the account with timeout
            const lockoutUntil = now + validLockoutMs;
            const setExPromise = client.setex(lockoutKey, Math.ceil(validLockoutMs / 1000), lockoutUntil.toString());
            // Fire and forget with error catching
            setExPromise.catch(() => { });
          }
        })
        .catch(() => { });
    } catch (_error) {
      // Silent fail for recording attempts
    }
  }

  /**
   * Increment failed attempts for a client (alias for recordFailedAttempt)
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   */
  async incrementAttempts(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<void> {
    return this.recordFailedAttempt(clientId, config);
  }

  /**
   * Reset rate limiting for a client after successful authentication
   * @param clientId Unique identifier for the client
   */
  async resetAttempts(clientId: string): Promise<void> {
    // Validate input
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      return;
    }

    const client = await this.getClient();
    if (!client) {
      return;
    }

    const trimmedClientId = clientId.trim().slice(0, 200); // Limit length
    const key = `rate_limit:${trimmedClientId}`;
    const lockoutKey = `lockout:${trimmedClientId}`;

    try {
      // Add timeout protection
      const delPromise = client.del(key, lockoutKey);
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1500); // 1.5 second timeout
      });

      await Promise.race([delPromise, timeoutPromise]);
    } catch (_error) {
      // Silent fail
    }
  }

  /**
   * Reset rate limiting for a client after successful authentication (alias for resetAttempts)
   * @param clientId Unique identifier for the client
   */
  async resetRateLimit(clientId: string): Promise<void> {
    return this.resetAttempts(clientId);
  }

  /**
   * Get current rate limiting status for a client
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   * @returns Current rate limiting status
   */
  async getRateLimitStatus(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<RateLimitResult> {
    return this.checkRateLimit(clientId, config);
  }
}

// Create and export a default instance
export const rateLimitingService = new RateLimitingService();

export default rateLimitingService;
