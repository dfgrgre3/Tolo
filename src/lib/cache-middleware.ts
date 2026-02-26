import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from './cache-service-unified';


import { logger } from '@/lib/logger';

/**
 * Generate a cache key based on request URL and user context
 * @param req Next.js request object
 * @param prefix Prefix for the cache key
 * @returns Generated cache key
 */
export function generateCacheKey(req: NextRequest, prefix: string): string {
  // Validate inputs
  if (!req || typeof req !== 'object' || !req.url) {
    logger.warn('Invalid request provided to generateCacheKey');
    return `cache:invalid:${Date.now()}`;
  }

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
    logger.warn('Invalid prefix provided to generateCacheKey');
    prefix = 'cache';
  }

  try {
    const url = new URL(req.url);
    const userId = req.headers.get('x-user-id') || 'anonymous';

    // Sanitize and limit length
    const sanitizedPrefix = prefix.trim().slice(0, 50);
    const sanitizedUserId = typeof userId === 'string' ? userId.trim().slice(0, 100) : 'anonymous';
    const sanitizedPathname = url.pathname.slice(0, 200);

    // Create base key with prefix, user, and pathname
    let key = `${sanitizedPrefix}:${sanitizedUserId}:${sanitizedPathname}`;

    // Add query parameters to key (limit to prevent DoS)
    const queryEntries = Array.from(url.searchParams.entries()).slice(0, 50);
    const queryParams = queryEntries
      .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
      .map(([key, value]) => `${key.slice(0, 50)}=${value.slice(0, 200)}`)
      .join('&');

    if (queryParams) {
      key += `?${queryParams.slice(0, 1000)}`; // Limit total query string length
    }

    // Replace special characters to make valid Redis key and limit total length
    const sanitizedKey = key.replace(/[^a-zA-Z0-9:_\-?&=.]/g, '_').slice(0, 500);
    return sanitizedKey;
  } catch (error) {
    logger.error('Error generating cache key:', error);
    return `cache:error:${Date.now()}`;
  }
}

/**
 * Generate a cache key based on request URL and authentication token
 * @param req Next.js request object
 * @param prefix Prefix for the cache key
 * @returns Generated cache key
 */
export function generateAuthCacheKey(req: NextRequest, prefix: string): string {
  // Validate inputs
  if (!req || typeof req !== 'object' || !req.url) {
    logger.warn('Invalid request provided to generateAuthCacheKey');
    return `cache:invalid:${Date.now()}`;
  }

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
    logger.warn('Invalid prefix provided to generateAuthCacheKey');
    prefix = 'cache';
  }

  try {
    const url = new URL(req.url);
    // Extract user ID from authorization header or cookies
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.split(' ')[1];
    const userId = token ? token.substring(0, 16) : 'anonymous'; // Use first 16 chars of token for privacy

    // Sanitize and limit length
    const sanitizedPrefix = prefix.trim().slice(0, 50);
    const sanitizedUserId = typeof userId === 'string' ? userId.trim().slice(0, 100) : 'anonymous';
    const sanitizedPathname = url.pathname.slice(0, 200);

    // Create base key with prefix, user, and pathname
    let key = `${sanitizedPrefix}:${sanitizedUserId}:${sanitizedPathname}`;

    // Add query parameters to key (limit to prevent DoS)
    const queryEntries = Array.from(url.searchParams.entries()).slice(0, 50);
    const queryParams = queryEntries
      .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
      .map(([key, value]) => `${key.slice(0, 50)}=${value.slice(0, 200)}`)
      .join('&');

    if (queryParams) {
      key += `?${queryParams.slice(0, 1000)}`; // Limit total query string length
    }

    // Replace special characters to make valid Redis key and limit total length
    const sanitizedKey = key.replace(/[^a-zA-Z0-9:_\-?&=.]/g, '_').slice(0, 500);
    return sanitizedKey;
  } catch (error) {
    logger.error('Error generating auth cache key:', error);
    return `cache:error:${Date.now()}`;
  }
}

/**
 * Middleware to handle caching for GET requests
 * @param req Next.js request object
 * @param handler Handler function to process the request if not cached
 * @param prefix Cache key prefix
 * @param ttl Time to live in seconds
 * @returns Cached or fresh response
 */
export async function withCache(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  prefix: string,
  ttl: number = 300 // Default 5 minutes
): Promise<NextResponse> {
  // Validate inputs
  if (!req || typeof req !== 'object') {
    logger.error('Invalid request provided to withCache');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!handler || typeof handler !== 'function') {
    logger.error('Invalid handler provided to withCache');
    return NextResponse.json({ error: 'Invalid handler' }, { status: 500 });
  }

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
    logger.warn('Invalid prefix provided to withCache, using default');
    prefix = 'cache';
  }

  // Validate and limit TTL
  const validTTL = Math.max(1, Math.min(ttl, 86400)); // 1 second to 24 hours

  // Only cache GET requests
  if (req.method !== 'GET') {
    return handler(req);
  }

  const cacheKey = generateCacheKey(req, prefix);

  try {
    // Try to get from cache first with timeout
    const getCachePromise = CacheService.get<any>(cacheKey);
    const cacheTimeoutPromise = new Promise<any>((resolve) => {
      setTimeout(() => resolve(null), 2000); // 2 second timeout
    });

    const cachedData = await Promise.race([getCachePromise, cacheTimeoutPromise]);
    if (cachedData && cachedData.data) {
      // Validate cached data structure
      const timestamp = cachedData.timestamp && typeof cachedData.timestamp === 'number'
        ? cachedData.timestamp
        : Date.now();

      // Return cached response with cache header
      const response = NextResponse.json(cachedData.data, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey.slice(0, 200),
          'X-Cache-Timestamp': timestamp.toString(),
          'X-Cache-Age': Math.floor((Date.now() - timestamp) / 1000).toString(),
        }
      });
      return response;
    }

    // Process request if not in cache
    const response = await handler(req);

    // Cache successful responses (status 200) - non-blocking
    if (response.status === 200) {
      // Don't await - cache in background
      (async () => {
        try {
          // Clone response to read body with timeout
          const clonedResponse = response.clone();
          const jsonPromise = clonedResponse.json();
          const jsonTimeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('JSON parsing timeout'));
            }, 3000); // 3 second timeout
          });

          const data = await Promise.race([jsonPromise, jsonTimeoutPromise]);

          // Cache the response data with timeout
          const setCachePromise = CacheService.set(cacheKey, { data, timestamp: Date.now() }, validTTL);
          const setCacheTimeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              logger.warn('Cache set timeout');
              resolve();
            }, 2000); // 2 second timeout
          });

          await Promise.race([setCachePromise, setCacheTimeoutPromise]);
        } catch (cacheError) {
          logger.warn('Error caching response data:', cacheError);
          // Don't fail the request if caching fails
        }
      })();

      // Add cache headers
      response.headers.set('X-Cache', 'MISS');
      response.headers.set('X-Cache-Key', cacheKey.slice(0, 200));
    }

    return response;
  } catch (error) {
    logger.error('Cache middleware error:', error);
    // Fall back to direct processing if cache fails
    return handler(req);
  }
}

/**
 * Middleware to handle caching for authenticated GET requests
 * @param req Next.js request object
 * @param handler Handler function to process the request if not cached
 * @param prefix Cache key prefix
 * @param ttl Time to live in seconds
 * @returns Cached or fresh response
 */
export async function withAuthCache(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  prefix: string,
  ttl: number = 300 // Default 5 minutes
): Promise<NextResponse> {
  // Validate inputs
  if (!req || typeof req !== 'object') {
    logger.error('Invalid request provided to withAuthCache');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!handler || typeof handler !== 'function') {
    logger.error('Invalid handler provided to withAuthCache');
    return NextResponse.json({ error: 'Invalid handler' }, { status: 500 });
  }

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
    logger.warn('Invalid prefix provided to withAuthCache, using default');
    prefix = 'cache';
  }

  // Validate and limit TTL
  const validTTL = Math.max(1, Math.min(ttl, 86400)); // 1 second to 24 hours

  // Only cache GET requests
  if (req.method !== 'GET') {
    return handler(req);
  }

  const cacheKey = generateAuthCacheKey(req, prefix);

  try {
    // Try to get from cache first with timeout
    const getCachePromise = CacheService.get<any>(cacheKey);
    const cacheTimeoutPromise = new Promise<any>((resolve) => {
      setTimeout(() => resolve(null), 2000); // 2 second timeout
    });

    const cachedData = await Promise.race([getCachePromise, cacheTimeoutPromise]);
    if (cachedData && cachedData.data) {
      // Validate cached data structure
      const timestamp = cachedData.timestamp && typeof cachedData.timestamp === 'number'
        ? cachedData.timestamp
        : Date.now();

      // Return cached response with cache header
      const response = NextResponse.json(cachedData.data, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey.slice(0, 200),
          'X-Cache-Timestamp': timestamp.toString(),
          'X-Cache-Age': Math.floor((Date.now() - timestamp) / 1000).toString(),
        }
      });
      return response;
    }

    // Process request if not in cache
    const response = await handler(req);

    // Cache successful responses (status 200) - non-blocking
    if (response.status === 200) {
      // Don't await - cache in background
      (async () => {
        try {
          // Clone response to read body with timeout
          const clonedResponse = response.clone();
          const jsonPromise = clonedResponse.json();
          const jsonTimeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('JSON parsing timeout'));
            }, 3000); // 3 second timeout
          });

          const data = await Promise.race([jsonPromise, jsonTimeoutPromise]);

          // Cache the response data with timeout
          const setCachePromise = CacheService.set(cacheKey, { data, timestamp: Date.now() }, validTTL);
          const setCacheTimeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              logger.warn('Cache set timeout');
              resolve();
            }, 2000); // 2 second timeout
          });

          await Promise.race([setCachePromise, setCacheTimeoutPromise]);
        } catch (cacheError) {
          logger.warn('Error caching response data:', cacheError);
          // Don't fail the request if caching fails
        }
      })();

      // Add cache headers
      response.headers.set('X-Cache', 'MISS');
      response.headers.set('X-Cache-Key', cacheKey.slice(0, 200));
    }

    return response;
  } catch (error) {
    logger.error('Auth cache middleware error:', error);
    // Fall back to direct processing if cache fails
    return handler(req);
  }
}

/**
 * Higher-order function to wrap a handler with caching
 * @param handler Handler function to wrap
 * @param prefix Cache key prefix
 * @param ttl Time to live in seconds
 * @returns Handler function with caching
 */
export function withCaching(
  handler: (req: NextRequest) => Promise<NextResponse>,
  prefix: string,
  ttl?: number
): (req: NextRequest) => Promise<NextResponse> {
  return (req: NextRequest) => withCache(req, handler, prefix, ttl);
}