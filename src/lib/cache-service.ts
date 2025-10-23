import { redis } from './redis';
import { prisma } from './prisma';
import { recordCacheMetric } from './db-monitor';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[];
  namespace?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keysCount: number;
  totalRequests: number;
  averageResponseTime: number;
}

interface CacheMetrics {
  operation: string;
  duration: number;
  hit: boolean;
  timestamp: number;
}

/**
 * Unified Cache Service - Single source of truth for all caching operations
 * Consolidates functionality from multiple cache services into one centralized service
 */
export class CacheService {
  private static instance: CacheService;
  private static stats = { hits: 0, misses: 0, totalRequests: 0, totalResponseTime: 0 };
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly DEFAULT_NAMESPACE = 'app';

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate namespaced cache key
   */
  private generateKey(key: string, namespace?: string): string {
    const ns = namespace || CacheService.DEFAULT_NAMESPACE;
    return `${ns}:${key}`;
  }

  /**
   * Record cache metrics for monitoring
   */
  private recordMetrics(operation: string, duration: number, hit: boolean): void {
    this.stats.totalRequests++;
    this.stats.totalResponseTime += duration;

    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    // Record in database monitor if available
    if (recordCacheMetric) {
      recordCacheMetric(operation, duration, hit);
    }
  }

  // ==================== CORE CACHE OPERATIONS ====================

  /**
   * Get data from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const start = Date.now();
    const namespacedKey = this.generateKey(key, namespace);

    try {
      const data = await redis.get(namespacedKey);
      const duration = Date.now() - start;
      const hit = data !== null;

      this.recordMetrics('get', duration, hit);

      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('get', duration, false);
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with options
   */
  async set(key: string, value: any, options: CacheOptions = {}, namespace?: string): Promise<void> {
    const start = Date.now();
    const namespacedKey = this.generateKey(key, namespace);
    const ttl = options.ttl || CacheService.DEFAULT_TTL;

    try {
      await redis.setEx(namespacedKey, ttl, JSON.stringify(value));
      const duration = Date.now() - start;

      // Store tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.setTags(namespacedKey, options.tags, ttl);
      }

      this.recordMetrics('set', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('set', duration, false);
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  async del(key: string, namespace?: string): Promise<void> {
    const start = Date.now();
    const namespacedKey = this.generateKey(key, namespace);

    try {
      await redis.del(namespacedKey);

      // Also remove from tags
      await this.removeFromTags(namespacedKey);

      const duration = Date.now() - start;
      this.recordMetrics('del', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('del', duration, false);
      console.error('Cache del error:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const start = Date.now();
    const namespacedKey = this.generateKey(key, namespace);

    try {
      const result = await redis.exists(namespacedKey);
      const duration = Date.now() - start;
      this.recordMetrics('exists', duration, result > 0);
      return result > 0;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('exists', duration, false);
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Get multiple keys from cache efficiently
   */
  async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    const start = Date.now();
    const namespacedKeys = keys.map(key => this.generateKey(key, namespace));

    try {
      const results = await redis.mGet(namespacedKeys);
      const duration = Date.now() - start;

      // Count hits (non-null values)
      const hitCount = results.filter(r => r !== null).length;
      this.recordMetrics('mget', duration, hitCount > 0);

      return results.map(result => {
        if (result) {
          return JSON.parse(result) as T;
        }
        return null;
      });
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('mget', duration, false);
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs in cache
   */
  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}, namespace?: string): Promise<void> {
    const start = Date.now();
    const ttl = options.ttl || CacheService.DEFAULT_TTL;

    try {
      const pipeline = redis.multi();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const namespacedKey = this.generateKey(key, namespace);
        pipeline.setEx(namespacedKey, ttl, JSON.stringify(value));

        // Handle tags if provided
        if (options.tags && options.tags.length > 0) {
          options.tags.forEach(tag => {
            pipeline.sAdd(`tag:${tag}`, namespacedKey);
          });
          pipeline.expire(`tag:${key}`, ttl);
        }
      }

      await pipeline.exec();
      const duration = Date.now() - start;
      this.recordMetrics('mset', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('mset', duration, false);
      console.error('Cache mset error:', error);
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async mdel(keys: string[], namespace?: string): Promise<void> {
    const start = Date.now();
    const namespacedKeys = keys.map(key => this.generateKey(key, namespace));

    try {
      if (namespacedKeys.length === 0) return;

      await redis.del(namespacedKeys);

      // Remove from tags
      for (const key of namespacedKeys) {
        await this.removeFromTags(key);
      }

      const duration = Date.now() - start;
      this.recordMetrics('mdel', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('mdel', duration, false);
      console.error('Cache mdel error:', error);
    }
  }

  // ==================== TAG-BASED OPERATIONS ====================

  /**
   * Set tags for a cache key
   */
  private async setTags(key: string, tags: string[], ttl: number): Promise<void> {
    for (const tag of tags) {
      await redis.sAdd(`tag:${tag}`, key);
    }
    await redis.expire(`tag:${key}`, ttl);
  }

  /**
   * Remove key from all its tags
   */
  private async removeFromTags(key: string): Promise<void> {
    try {
      const tagKey = `tag:${key}`;
      const tags = await redis.sMembers(tagKey);

      if (tags.length > 0) {
        for (const tag of tags) {
          await redis.sRem(`tag:${tag}`, key);
        }
      }
      await redis.del(tagKey);
    } catch (error) {
      console.error('Error removing from tags:', error);
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const start = Date.now();

    try {
      const tagKey = `tag:${tag}`;
      const keys = await redis.sMembers(tagKey);

      if (keys.length > 0) {
        await redis.del(...keys);
        await redis.del(tagKey);
      }

      const duration = Date.now() - start;
      this.recordMetrics('invalidateByTag', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('invalidateByTag', duration, false);
      console.error('Cache invalidate by tag error:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const start = Date.now();

    try {
      const stream = redis.scanIterator({
        MATCH: pattern,
        COUNT: 100
      });

      const keysToDelete: string[] = [];
      for await (const key of stream) {
        keysToDelete.push(key);
      }

      if (keysToDelete.length > 0) {
        await this.mdel(keysToDelete.map(key => key.replace(`${CacheService.DEFAULT_NAMESPACE}:`, '')));
      }

      const duration = Date.now() - start;
      this.recordMetrics('invalidatePattern', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('invalidatePattern', duration, false);
      console.error('Error invalidating cache pattern:', error);
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
    namespace?: string
  ): Promise<T> {
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, options, namespace);
    return fresh;
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAll(): Promise<void> {
    const start = Date.now();

    try {
      await redis.flushAll();
      this.resetStats();
      const duration = Date.now() - start;
      this.recordMetrics('clearAll', duration, true);
    } catch (error) {
      const duration = Date.now() - start;
      this.recordMetrics('clearAll', duration, false);
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      keysCount: 0, // Would need Redis info command to get this
      totalRequests: this.stats.totalRequests,
      averageResponseTime: this.stats.totalRequests > 0
        ? this.stats.totalResponseTime / this.stats.totalRequests
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, totalRequests: 0, totalResponseTime: 0 };
  }

  // ==================== USER-SPECIFIC OPERATIONS ====================

  /**
   * Get user courses with caching
   */
  async getUserCourses(userId: string): Promise<any[]> {
    const cacheKey = `user:${userId}:courses`;
    return this.getOrSet(
      cacheKey,
      async () => {
        return prisma.subjectEnrollment.findMany({
          where: { userId },
          include: { subject: true },
        });
      },
      { tags: [`user:${userId}`, 'courses'], ttl: 600 }, // 10 minutes
      'user'
    );
  }

  /**
   * Get user progress with caching
   */
  async getUserProgress(userId: string): Promise<any[]> {
    const cacheKey = `user:${userId}:progress`;
    return this.getOrSet(
      cacheKey,
      async () => {
        return prisma.progressSnapshot.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 30,
        });
      },
      { tags: [`user:${userId}`, 'progress'], ttl: 300 },
      'user'
    );
  }

  /**
   * Get study sessions with caching
   */
  async getStudySessions(userId: string, limit: number = 50): Promise<any[]> {
    const cacheKey = `user:${userId}:sessions:${limit}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        return prisma.studySession.findMany({
          where: { userId },
          orderBy: { startTime: 'desc' },
          take: limit,
        });
      },
      { tags: [`user:${userId}`, 'sessions'], ttl: 300 },
      'user'
    );
  }

  /**
   * Invalidate all user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByTag(`user:${userId}`);
  }

  // ==================== EDUCATIONAL CONTENT OPERATIONS ====================

  /**
   * Get educational data with caching
   */
  async getEducationalData(type: 'subjects' | 'courses' | 'exams', limit?: number): Promise<any[]> {
    const cacheKey = `educational:${type}${limit ? `:${limit}` : ''}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        switch (type) {
          case 'subjects':
            return prisma.resource.findMany({
              where: { type: 'subject' },
              take: limit || 100,
            });
          case 'courses':
            return prisma.resource.findMany({
              where: { type: 'course' },
              take: limit || 100,
            });
          case 'exams':
            return prisma.exam.findMany({
              take: limit || 100,
            });
          default:
            return [];
        }
      },
      { tags: ['educational', type], ttl: 1800 }, // 30 minutes
      'educational'
    );
  }

  /**
   * Cache subject data
   */
  async cacheSubject(subjectId: string, data: any): Promise<void> {
    await this.set(
      `subject:${subjectId}`,
      data,
      { tags: ['educational', 'subjects'], ttl: 1800 },
      'educational'
    );
  }

  /**
   * Get cached subject data
   */
  async getCachedSubject(subjectId: string): Promise<any | null> {
    return this.get(`subject:${subjectId}`, 'educational');
  }

  /**
   * Invalidate educational content cache
   */
  async invalidateEducationalCache(type?: string): Promise<void> {
    if (type) {
      await this.invalidateByTag(type);
    } else {
      await Promise.all([
        this.invalidateByTag('educational'),
        this.invalidateByTag('subjects'),
        this.invalidateByTag('courses'),
        this.invalidateByTag('exams'),
      ]);
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Get analytics data with caching
   */
  async getAnalyticsData(userId: string, type: string, period: string): Promise<any> {
    const cacheKey = `analytics:${userId}:${type}:${period}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        // Analytics data fetching logic would go here
        return {};
      },
      { tags: [`user:${userId}`, 'analytics', type], ttl: 600 },
      'analytics'
    );
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalyticsCache(userId?: string): Promise<void> {
    if (userId) {
      await this.invalidateByTag(`user:${userId}`);
    } else {
      await this.invalidateByTag('analytics');
    }
  }
}

// Export singleton instance
const cacheService = CacheService.getInstance();

// Export convenience functions
export async function getCachedOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {},
  namespace?: string
): Promise<T> {
  return cacheService.getOrSet(key, fetchFn, options, namespace);
}

export async function batchGetOrSet<T>(
  items: { key: string; fetchFn: () => Promise<T>; options?: CacheOptions; namespace?: string }[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      return cacheService.getOrSet(item.key, item.fetchFn, item.options || {}, item.namespace);
    })
  );
}

export default cacheService;
