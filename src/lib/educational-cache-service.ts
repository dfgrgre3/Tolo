import { EducationalCache, CacheService } from './cache';
import { logger } from '@/lib/logger';

const MEDIUM_TTL = 600;
const LONG_TTL = 3600;

export async function cacheEducationalContent<T>(key: string, data: T, ttl: number = LONG_TTL): Promise<void> {
  await EducationalCache.getOrSet(key, async () => data, ttl);
}

export async function getEducationalContent<T>(key: string): Promise<T | null> {
  return await CacheService.get<T>(`educational:${key}`);
}

export async function getOrSetEducationalContent<T>(key: string, fetchFn: () => Promise<T>, ttl: number = LONG_TTL): Promise<T> {
  return EducationalCache.getOrSet(key, fetchFn, ttl);
}

export async function getOrSetSubject(subjectId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
  return getOrSetEducationalContent(`subject:${subjectId}`, fetchFn, MEDIUM_TTL);
}

export async function getOrSetCourse(courseId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
  return getOrSetEducationalContent(`course:${courseId}`, fetchFn, MEDIUM_TTL);
}

export async function getOrSetLesson(lessonId: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
  return getOrSetEducationalContent(`lesson:${lessonId}`, fetchFn, MEDIUM_TTL);
}

export async function invalidateEducationalContent(key: string): Promise<void> {
  await EducationalCache.invalidate(key);
}

export async function invalidateEducationalContentPattern(pattern: string): Promise<void> {
  await EducationalCache.invalidatePattern(pattern);
}

export async function batchGetOrSetEducationalContent<T>(items: { key: string; fetchFn: () => Promise<T>; ttl?: number }[]): Promise<T[]> {
  return Promise.all(items.map(item => getOrSetEducationalContent(item.key, item.fetchFn, item.ttl || LONG_TTL)));
}

const educationalCacheService = {
  getOrSetEducationalContent,
  getOrSetSubject,
  getOrSetCourse,
  getOrSetLesson,
  invalidateEducationalContent,
  invalidateEducationalContentPattern,
  batchGetOrSetEducationalContent
};

export default educationalCacheService;
