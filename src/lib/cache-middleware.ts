import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from './redis';

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
  // Only cache GET requests
  if (req.method !== 'GET') {
    return handler(req);
  }

  const cacheKey = generateCacheKey(req, prefix);
  
  try {
    // Try to get from cache first
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

    // Process request if not in cache
    const response = await handler(req);
    
    // Cache successful responses (status 200)
    if (response.status === 200) {
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
  // Only cache GET requests
  if (req.method !== 'GET') {
    return handler(req);
  }

  const cacheKey = generateAuthCacheKey(req, prefix);
  
  try {
    // Try to get from cache first
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

    // Process request if not in cache
    const response = await handler(req);
    
    // Cache successful responses (status 200)
    if (response.status === 200) {
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