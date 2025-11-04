import { redis } from './redis';
import { prisma } from './prisma';
import cacheService from './cache-service';

// This file is deprecated. Please use cache-service-unified.ts instead.
export * from './cache-service-unified';

// Export the centralized cache service as CacheService for backward compatibility
export const CacheService = cacheService;
export default CacheService;

// Export the convenience functions from the centralized service
export async function getOrSetEnhanced<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = cacheService['DEFAULT_TTL']
): Promise<T> {
  return cacheService.getOrSet(key, fetchFn, { ttl });
}

export async function batchGetOrSet<T>(
  items: { key: string; fetchFn: () => Promise<T>; ttl?: number }[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      return cacheService.getOrSet(item.key, item.fetchFn, { ttl: item.ttl ?? cacheService['DEFAULT_TTL'] });
    })
  );
}
