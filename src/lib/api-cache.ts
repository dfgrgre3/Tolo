import { NextResponse } from 'next/server';
import { CacheService } from './cache';
import { logger } from './logger';

export interface ApiCacheOptions {
  ttl?: number;
  tags?: string[];
  publicOnly?: boolean;
}

/**
 * High-performance API Response Caching
 * Tiered Redis/Memory cache for Next.js Route Handlers (API Gateway level)
 */
export class ApiCache {
  /**
   * Caches the result of an API route handler.
   * Useful for high-traffic read-only public endpoints.
   */
  static async wrap<T>(
    cacheKey: string,
    handler: () => Promise<NextResponse<T>>,
    options: ApiCacheOptions = {}
  ): Promise<NextResponse<T>> {
    const { ttl = 300, publicOnly = true } = options;

    try {
      // 1. Attempt to retrieve from cache
      const cached = await CacheService.get<{
        data: any;
        status: number;
        headers: Record<string, string>;
      }>(`api_v1:${cacheKey}`);

      if (cached) {
        logger.debug(`[ApiCache] HIT: ${cacheKey}`);
        
        // Ensure cache-control is present for client-side/CDN caching
        const headers = {
          ...cached.headers,
          'X-Cache': 'HIT',
          'Cache-Control': publicOnly 
            ? `public, s-maxage=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`
            : `private, no-cache`,
        };

        return NextResponse.json(cached.data, { 
          status: cached.status,
          headers 
        });
      }

      // 2. MISS: Execute handler
      logger.debug(`[ApiCache] MISS: ${cacheKey}`);
      const response = await handler();

      // Only cache successful GET-like requests (status < 400)
      if (response.status < 400) {
        // Clone response to avoid body-already-read errors
        const clone = response.clone();
        const data = await clone.json();
        
        // Extract serializable headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          if (!['set-cookie', 'x-request-id'].includes(key.toLowerCase())) {
            headers[key] = value;
          }
        });

        // 3. Store in distributed cache (Tier 2)
        await CacheService.set(`api_v1:${cacheKey}`, {
          data,
          status: response.status,
          headers
        }, ttl);
      }

      // 4. Inject HIT/MISS meta for visibility
      response.headers.set('X-Cache', 'MISS');
      if (publicOnly) {
         response.headers.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`);
      }

      return response;
    } catch (error) {
      logger.error(`[ApiCache] CRITICAL ERROR on ${cacheKey}:`, error);
      // Fallback: Just return fresh data if cache fails to avoid outage
      return handler();
    }
  }

  /**
   * Helper to generate unique cache keys based on search params
   */
  static generateKey(path: string, params?: URLSearchParams): string {
    if (!params) return path;
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const paramString = sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
    return `${path}${paramString ? '?' + paramString : ''}`;
  }
}
