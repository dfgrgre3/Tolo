import { CachePrefixes, CacheService } from './cache';
import { logger } from '@/lib/logger';

export { CachePrefixes };

export async function invalidateUserCache(userId: string): Promise<void> {
  // OPTIMIZATION: Try known prefixes first to avoid O(N) scan in Redis clusters.
  const commonPatterns = [
    `user:${userId}:*`,
    `profile:${userId}:*`,
    `tasks:${userId}:*`,
    `progress:${userId}:*`,
    `sessions:${userId}:*`
  ];
  
  for (const pattern of commonPatterns) {
    await CacheService.invalidatePattern(pattern);
  }

  // FAIL-SAFE: The legacy catch-all pattern (O(N) in Redis)
  // Ensure we don't miss any keys following odd patterns.
  await CacheService.invalidatePattern(`*:${userId}:*`);
}

export async function invalidateUserDataCache(userId: string, dataType: string): Promise<void> {
  // Optimized prefix-based invalidation
  await CacheService.invalidatePattern(`${dataType}:${userId}:*`);
  await CacheService.invalidatePattern(`user:${userId}:${dataType}:*`);
  
  // Legacy fallback
  await CacheService.invalidatePattern(`*:${userId}:${dataType}:*`);
}

export async function invalidateEducationalContentCache(subjectId?: string, courseId?: string): Promise<void> {
  let pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*`;
  if (subjectId && courseId) pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*:${subjectId}:${courseId}:*`;
  else if (subjectId) pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*:${subjectId}:*`;
  await CacheService.invalidatePattern(pattern);
}

export async function invalidateAnnouncementsCache(): Promise<void> {
  await CacheService.invalidatePattern(`${CachePrefixes.ANNOUNCEMENTS}:*`);
}

export async function invalidatePrefixCache(prefix: string): Promise<void> {
  await CacheService.invalidatePattern(`${prefix}:*`);
}

export async function invalidateAllCache(): Promise<void> {
  await CacheService.flushAll();
}

export async function invalidateAnalyticsCache(userId: string): Promise<void> {
  await CacheService.invalidatePattern(`${CachePrefixes.USER_ANALYTICS}:*:${userId}:*`);
}

export async function invalidateMultiplePatterns(patterns: string[]): Promise<void> {
  try {
    for (const pattern of patterns) await CacheService.invalidatePattern(pattern);
  } catch (error) {
    logger.error('Error invalidating multiple cache patterns:', error);
  }
}

const cacheInvalidationService = {
  CachePrefixes,
  invalidateUserCache,
  invalidateUserDataCache,
  invalidateEducationalContentCache,
  invalidateAnnouncementsCache,
  invalidateAnalyticsCache,
  invalidatePrefixCache,
  invalidateAllCache,
  invalidateMultiplePatterns
};

export default cacheInvalidationService;
