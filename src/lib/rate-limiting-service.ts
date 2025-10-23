import { RedisClientType } from 'redis';
import { redis } from './redis';

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxAttempts: number;     // Maximum attempts allowed in the window
  lockoutMs?: number;      // Lockout duration in milliseconds (optional)
}

export interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  remainingTime?: number;
  lockedUntil?: number;
}

export class RateLimitingService {
  private redisClient: RedisClientType;
  private defaultConfig: RateLimitConfig;

  constructor(
    redisClient: RedisClientType,
    defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
      lockoutMs: 30 * 60 * 1000 // 30 minutes
    }
  ) {
    this.redisClient = redisClient;
    this.defaultConfig = defaultConfig;
  }

  /**
   * Check if a client has exceeded rate limits
   * @param clientId Unique identifier for the client (e.g., IP + User Agent)
   * @param config Rate limiting configuration
   * @returns RateLimitResult indicating if the request is allowed
   */
  async checkRateLimit(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<RateLimitResult> {
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    try {
      // Check if account is locked
      const lockedUntil = await this.redisClient.get(lockoutKey);
      if (lockedUntil) {
        const lockoutTime = parseInt(lockedUntil, 10);
        if (now < lockoutTime) {
          const remainingTime = Math.ceil((lockoutTime - now) / 60000); // in minutes
          return {
            allowed: false,
            attempts: config.maxAttempts,
            remainingTime,
            lockedUntil: lockoutTime
          };
        } else {
          // Lockout expired, remove the lockout key
          await this.redisClient.del(lockoutKey);
        }
      }
      
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisClient.multi();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Get current count
      pipeline.zcard(key);
      
      const results = await pipeline.exec();
      const currentCount = results[1] as number;
      
      return {
        allowed: currentCount < config.maxAttempts,
        attempts: currentCount,
        remainingTime: undefined
      };
    } catch (error) {
      console.error('Rate limiting check error:', error);
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
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;
    
    const now = Date.now();
    
    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisClient.multi();
      
      // Add current attempt
      pipeline.zadd(key, { [now]: now.toString() });
      
      // Set expiration for the sorted set
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      await pipeline.exec();
      
      // Check if we need to lock the account
      const result = await this.checkRateLimit(clientId, config);
      if (result.attempts >= config.maxAttempts && config.lockoutMs) {
        // Lock the account
        const lockoutUntil = now + config.lockoutMs;
        await this.redisClient.setEx(lockoutKey, Math.ceil(config.lockoutMs / 1000), lockoutUntil.toString());
      }
    } catch (error) {
      console.error('Failed to record failed attempt:', error);
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
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;
    
    try {
      await this.redisClient.del(key, lockoutKey);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
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
export const rateLimitingService = new RateLimitingService(redis);

export default rateLimitingService;