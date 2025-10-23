import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from './redis';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  keyGenerator?: (req: NextRequest) => string;
  skipCache?: boolean;
  bypassCache?: boolean;
}

/**
 * Generate a cache key based on request URL and user context
 * @param req Next.js request object
 * @param prefix Prefix for the cache key
 * @returns Generated cache key
 */
export function generateCacheKey(req: NextRequest, prefix: string): string {
  const url = new URL(req.url);
  const userId = req.headers.get('x-user-id') || 'anonymous';
  
  // Create base key with prefix, user, and pathname
  let key = `${prefix}:${userId}:${url.pathname}`;
  
  // Add query parameters to key
  const queryParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  if (queryParams) {
    key += `?${queryParams}`;
  }
  
  // Replace special characters to make valid Redis key
  return key.replace(/[^a-zA-Z0-9:_\-?&=.]/g, '_');
}

/**
 * Generate a cache key based on request URL and authentication token
 * @param req Next.js request object
 * @param prefix Prefix for the cache key
 * @returns Generated cache key
 */
export function generateAuthCacheKey(req: NextRequest, prefix: string): string {
  const url = new URL(req.url);
  // Extract user ID from authorization header or cookies
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  const userId = token ? token.substring(0, 16) : 'anonymous'; // Use first 16 chars of token for privacy
  
  // Create base key with prefix, user, and pathname
  let key = `${prefix}:${userId}:${url.pathname}`;
  
  // Add query parameters to key
  const queryParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  if (queryParams) {
    key += `?${queryParams}`;
  }
  
  // Replace special characters to make valid Redis key
  return key.replace(/[^a-zA-Z0-9:_\-?&=.]/g, '_');
}

/**
 * Enhanced middleware to handle caching for GET requests
 * @param req Next.js request object
 * @param handler Handler function to process the request if not cached
 * @param options Cache configuration options
 * @returns Cached or fresh response
 */
export async function withCache(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
): Promise<NextResponse> {
  const {
    ttl = 300, // Default 5 minutes
    prefix = 'api',
    keyGenerator = (req) => generateCacheKey(req, prefix),
    skipCache = false,
    bypassCache = false
  } = options;

  // Skip caching for non-GET requests
  if (req.method !== 'GET' || skipCache) {
    return handler(req);
  }

  const cacheKey = keyGenerator(req);
  
  try {
    // Try to get from cache first (unless bypassing)
    if (!bypassCache) {
      const cachedData = await CacheService.get<any>(cacheKey);
      if (cachedData) {
        // Return cached response with cache header
        const response = NextResponse.json(cachedData.data, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-Timestamp': cachedData.timestamp.toString(),
            'X-Cache-Age': Math.floor((Date.now() - cachedData.timestamp) / 1000).toString(),
          }
        });
        return response;
      }
    }

    // Process request if not in cache or bypassing cache
    const response = await handler(req);
    
    // Cache successful responses (status 200)
    if (response.status === 200 && !bypassCache) {
      try {
        // Clone response to read body
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        // Cache the response data
        await CacheService.set(cacheKey, { data, timestamp: Date.now() }, ttl);
        
        // Add cache headers
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('X-Cache-Key', cacheKey);
      } catch (cacheError) {
        console.warn('Error caching response data:', cacheError);
        // Don't fail the request if caching fails
      }
    }
    
    return response;
  } catch (error) {
    console.error('Cache middleware error:', error);
    // Fall back to direct processing if cache fails
    return handler(req);
  }
}

/**
 * Enhanced middleware to handle caching for authenticated GET requests
 * @param req Next.js request object
 * @param handler Handler function to process the request if not cached
 * @param options Cache configuration options
 * @returns Cached or fresh response
 */
export async function withAuthCache(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
): Promise<NextResponse> {
  const {
    ttl = 300, // Default 5 minutes
    prefix = 'auth_api',
    keyGenerator = (req) => generateAuthCacheKey(req, prefix),
    skipCache = false,
    bypassCache = false
  } = options;

  // Skip caching for non-GET requests
  if (req.method !== 'GET' || skipCache) {
    return handler(req);
  }

  const cacheKey = keyGenerator(req);
  
  try {
    // Try to get from cache first (unless bypassing)
    if (!bypassCache) {
      const cachedData = await CacheService.get<any>(cacheKey);
      if (cachedData) {
        // Return cached response with cache header
        const response = NextResponse.json(cachedData.data, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-Timestamp': cachedData.timestamp.toString(),
            'X-Cache-Age': Math.floor((Date.now() - cachedData.timestamp) / 1000).toString(),
          }
        });
        return response;
      }
    }

    // Process request if not in cache or bypassing cache
    const response = await handler(req);
    
    // Cache successful responses (status 200)
    if (response.status === 200 && !bypassCache) {
      try {
        // Clone response to read body
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        // Cache the response data
        await CacheService.set(cacheKey, { data, timestamp: Date.now() }, ttl);
        
        // Add cache headers
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('X-Cache-Key', cacheKey);
      } catch (cacheError) {
        console.warn('Error caching response data:', cacheError);
        // Don't fail the request if caching fails
      }
    }
    
    return response;
  } catch (error) {
    console.error('Auth cache middleware error:', error);
    // Fall back to direct processing if cache fails
    return handler(req);
  }
}

/**
 * Higher-order function to wrap a handler with caching
 * @param handler Handler function to wrap
 * @param options Cache configuration options
 * @returns Handler function with caching
 */
export function withCaching(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
): (req: NextRequest) => Promise<NextResponse> {
  return (req: NextRequest) => withCache(req, handler, options);
}

/**
 * Higher-order function to wrap a handler with authenticated caching
 * @param handler Handler function to wrap
 * @param options Cache configuration options
 * @returns Handler function with caching
 */
export function withAuthCaching(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
): (req: NextRequest) => Promise<NextResponse> {
  return (req: NextRequest) => withAuthCache(req, handler, options);
}