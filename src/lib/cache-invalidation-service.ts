import { CacheService } from "./redis";

/**
 * Cache Invalidation Service
 * Handles cache invalidation when data changes
 */

// Cache prefixes for different data types
export const CachePrefixes = {
  USER_TASKS: 'tasks',
  USER_SUBJECTS: 'subjects',
  USER_COURSES: 'courses',
  USER_PROGRESS: 'progress',
  USER_PROFILE: 'profile',
  USER_SESSIONS: 'sessions',
  EDUCATIONAL_CONTENT: 'educational',
  ANNOUNCEMENTS: 'announcements',
  USER_ANALYTICS: 'analytics',
};

/**
 * Invalidate all user-related cache
 * @param userId User ID to invalidate cache for
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await CacheService.invalidatePattern(`*:${userId}:*`);
}

/**
 * Invalidate specific user data cache
 * @param userId User ID
 * @param dataType Type of data to invalidate
 */
export async function invalidateUserDataCache(userId: string, dataType: string): Promise<void> {
  await CacheService.invalidatePattern(`*:${userId}:${dataType}:*`);
}

/**
 * Invalidate educational content cache
 * @param subjectId Subject ID (optional)
 * @param courseId Course ID (optional)
 */
export async function invalidateEducationalContentCache(subjectId?: string, courseId?: string): Promise<void> {
  let pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*`;
  
  if (subjectId && courseId) {
    pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*:${subjectId}:${courseId}:*`;
  } else if (subjectId) {
    pattern = `${CachePrefixes.EDUCATIONAL_CONTENT}:*:${subjectId}:*`;
  }
  
  await CacheService.invalidatePattern(pattern);
}

/**
 * Invalidate announcements cache
 */
export async function invalidateAnnouncementsCache(): Promise<void> {
  await CacheService.invalidatePattern(`${CachePrefixes.ANNOUNCEMENTS}:*`);
}

/**
 * Invalidate all cache for a specific prefix
 * @param prefix Cache prefix to invalidate
 */
export async function invalidatePrefixCache(prefix: string): Promise<void> {
  await CacheService.invalidatePattern(`${prefix}:*`);
}

/**
 * Invalidate all cache (use with caution)
 */
export async function invalidateAllCache(): Promise<void> {
  await CacheService.flushAll();
}

/**
 * Invalidate analytics cache for a user
 * @param userId User ID
 */
export async function invalidateAnalyticsCache(userId: string): Promise<void> {
  await CacheService.invalidatePattern(`${CachePrefixes.USER_ANALYTICS}:*:${userId}:*`);
}

/**
 * Invalidate cache by multiple patterns
 * @param patterns Array of patterns to invalidate
 */
export async function invalidateMultiplePatterns(patterns: string[]): Promise<void> {
  try {
    for (const pattern of patterns) {
      await CacheService.invalidatePattern(pattern);
    }
  } catch (error) {
    console.error('Error invalidating multiple cache patterns:', error);
  }
}

// Export default for backward compatibility
export default {
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
