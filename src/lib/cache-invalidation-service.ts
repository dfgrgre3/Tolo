import { CachePrefixes, CacheService } from './cache';
import { logger } from '@/lib/logger';

export { CachePrefixes };

export async function invalidateUserCache(userId: string): Promise<void> {
  await CacheService.invalidatePattern(`*:${userId}:*`);
}

export async function invalidateUserDataCache(userId: string, dataType: string): Promise<void> {
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
