import { getOrSetEnhanced, batchGetOrSet, CacheService } from "@/lib/cache-service-enhanced";

/**
 * Educational Content Cache Service
 * Manages caching for frequently accessed educational data with optimized performance
 */

// Cache TTL constants (in seconds)
const SHORT_TTL = 300;     // 5 minutes
const MEDIUM_TTL = 600;    // 10 minutes
const LONG_TTL = 3600;     // 1 hour
const VERY_LONG_TTL = 86400; // 24 hours

/**
 * Cache educational content with automatic expiration
 * @param key Unique key for the content
 * @param data Data to cache
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export async function cacheEducationalContent<T>(
  key: string, 
  data: T, 
  ttl: number = LONG_TTL
): Promise<void> {
  try {
    await CacheService.set(`educational:${key}`, data, ttl);
  } catch (error) {
    console.error(`Error caching educational content for key ${key}:`, error);
  }
}

/**
 * Get cached educational content
 * @param key Unique key for the content
 * @returns Cached data or null if not found/expired
 */
export async function getEducationalContent<T>(key: string): Promise<T | null> {
  try {
    return await CacheService.get<T>(`educational:${key}`);
  } catch (error) {
    console.error(`Error getting educational content for key ${key}:`, error);
    return null;
  }
}

/**
 * Get or set educational content with enhanced caching
 * @param key Unique key for the content
 * @param fetchFn Function to fetch data if not in cache
 * @param ttl Time to live in seconds
 * @returns Cached or freshly fetched data
 */
export async function getOrSetEducationalContent<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = LONG_TTL
): Promise<T> {
  return getOrSetEnhanced<T>(`educational:${key}`, fetchFn, ttl);
}

/**
 * Cache subject data
 * @param subjectId Subject ID
 * @param data Subject data
 */
export async function cacheSubject(subjectId: string, data: any): Promise<void> {
  await cacheEducationalContent(`subject:${subjectId}`, data, MEDIUM_TTL);
}

/**
 * Get cached subject data
 * @param subjectId Subject ID
 * @returns Subject data or null
 */
export async function getCachedSubject(subjectId: string): Promise<any> {
  return await getEducationalContent(`subject:${subjectId}`);
}

/**
 * Get or set subject data with enhanced caching
 * @param subjectId Subject ID
 * @param fetchFn Function to fetch data if not in cache
 * @returns Cached or freshly fetched data
 */
export async function getOrSetSubject(
  subjectId: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  return getOrSetEducationalContent(`subject:${subjectId}`, fetchFn, MEDIUM_TTL);
}

/**
 * Cache course data
 * @param courseId Course ID
 * @param data Course data
 */
export async function cacheCourse(courseId: string, data: any): Promise<void> {
  await cacheEducationalContent(`course:${courseId}`, data, MEDIUM_TTL);
}

/**
 * Get cached course data
 * @param courseId Course ID
 * @returns Course data or null
 */
export async function getCachedCourse(courseId: string): Promise<any> {
  return await getEducationalContent(`course:${courseId}`);
}

/**
 * Get or set course data with enhanced caching
 * @param courseId Course ID
 * @param fetchFn Function to fetch data if not in cache
 * @returns Cached or freshly fetched data
 */
export async function getOrSetCourse(
  courseId: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  return getOrSetEducationalContent(`course:${courseId}`, fetchFn, MEDIUM_TTL);
}

/**
 * Cache lesson data
 * @param lessonId Lesson ID
 * @param data Lesson data
 */
export async function cacheLesson(lessonId: string, data: any): Promise<void> {
  await cacheEducationalContent(`lesson:${lessonId}`, data, MEDIUM_TTL);
}

/**
 * Get cached lesson data
 * @param lessonId Lesson ID
 * @returns Lesson data or null
 */
export async function getCachedLesson(lessonId: string): Promise<any> {
  return await getEducationalContent(`lesson:${lessonId}`);
}

/**
 * Get or set lesson data with enhanced caching
 * @param lessonId Lesson ID
 * @param fetchFn Function to fetch data if not in cache
 * @returns Cached or freshly fetched data
 */
export async function getOrSetLesson(
  lessonId: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  return getOrSetEducationalContent(`lesson:${lessonId}`, fetchFn, MEDIUM_TTL);
}

/**
 * Cache frequently accessed curriculum data
 * @param curriculumId Curriculum ID
 * @param data Curriculum data
 */
export async function cacheCurriculum(curriculumId: string, data: any): Promise<void> {
  await cacheEducationalContent(`curriculum:${curriculumId}`, data, LONG_TTL);
}

/**
 * Get cached curriculum data
 * @param curriculumId Curriculum ID
 * @returns Curriculum data or null
 */
export async function getCachedCurriculum(curriculumId: string): Promise<any> {
  return await getEducationalContent(`curriculum:${curriculumId}`);
}

/**
 * Cache grade level data
 * @param gradeLevelId Grade level ID
 * @param data Grade level data
 */
export async function cacheGradeLevel(gradeLevelId: string, data: any): Promise<void> {
  await cacheEducationalContent(`grade:${gradeLevelId}`, data, LONG_TTL);
}

/**
 * Get cached grade level data
 * @param gradeLevelId Grade level ID
 * @returns Grade level data or null
 */
export async function getCachedGradeLevel(gradeLevelId: string): Promise<any> {
  return await getEducationalContent(`grade:${gradeLevelId}`);
}

/**
 * Invalidate educational content cache by key
 * @param key Specific key to invalidate
 */
export async function invalidateEducationalContent(key: string): Promise<void> {
  try {
    await CacheService.del(`educational:${key}`);
  } catch (error) {
    console.error(`Error invalidating educational content for key ${key}:`, error);
  }
}

/**
 * Invalidate educational content cache by pattern
 * @param pattern Pattern to match keys (e.g., "math:*")
 */
export async function invalidateEducationalContentPattern(pattern: string): Promise<void> {
  try {
    await CacheService.invalidatePattern(`educational:${pattern}`);
  } catch (error) {
    console.error(`Error invalidating educational content pattern ${pattern}:`, error);
  }
}

/**
 * Batch get or set educational content
 * @param items Array of items with keys and fetch functions
 * @returns Array of cached or freshly fetched data
 */
export async function batchGetOrSetEducationalContent<T>(
  items: { key: string; fetchFn: () => Promise<T>; ttl?: number }[]
): Promise<T[]> {
  const enhancedItems = items.map(item => ({
    key: `educational:${item.key}`,
    fetchFn: item.fetchFn,
    ttl: item.ttl
  }));
  return batchGetOrSet<T>(enhancedItems);
}

export default {
  cacheEducationalContent,
  getEducationalContent,
  getOrSetEducationalContent,
  cacheSubject,
  getCachedSubject,
  getOrSetSubject,
  cacheCourse,
  getCachedCourse,
  getOrSetCourse,
  cacheLesson,
  getCachedLesson,
  getOrSetLesson,
  cacheCurriculum,
  getCachedCurriculum,
  cacheGradeLevel,
  getCachedGradeLevel,
  invalidateEducationalContent,
  invalidateEducationalContentPattern,
  batchGetOrSetEducationalContent
};