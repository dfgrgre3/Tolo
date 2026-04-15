/**
 * API Response Cache Middleware
 * 
 * High-performance response caching for public GET endpoints.
 * Reduces database load by caching entire API responses in Redis.
 * 
 * Usage:
 * ```ts
 * import { withResponseCache } from '@/lib/api-response-cache';
 * 
 * export async function GET(request: NextRequest) {
 *   return withResponseCache(request, 'courses:list', async () => {
 *     // Your expensive DB query here
 *     const courses = await prisma.course.findMany();
 *     return NextResponse.json(courses);
 *   }, { ttl: 120 }); // Cache for 2 minutes
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from './cache';
import { logger } from './logger';

export interface ResponseCacheOptions {
    /** Cache TTL in seconds (default: 60) */
    ttl?: number;
    /** Only cache GET requests (default: true) */
    getOnly?: boolean;
    /** Custom cache key generator */
    keyGenerator?: (request: NextRequest, baseKey: string) => string;
    /** Condition to cache (return true to cache) */
    shouldCache?: (response: NextResponse) => boolean | Promise<boolean>;
    /** Tags for batch invalidation */
    tags?: string[];
}

const DEFAULT_OPTIONS: Required<ResponseCacheOptions> = {
    ttl: 60,
    getOnly: true,
    keyGenerator: (request, baseKey) => {
        const url = request.nextUrl;
        const params = Array.from(url.searchParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        return `api:cache:${baseKey}:${url.pathname}${params ? '?' + params : ''}`;
    },
    shouldCache: (response) => response.status === 200,
    tags: [],
};

/**
 * Wrap an API handler with response caching
 */
export async function withResponseCache<T extends NextResponse>(
    request: NextRequest,
    cacheKey: string,
    handler: () => Promise<T>,
    options: ResponseCacheOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Skip caching for non-GET requests
    if (opts.getOnly && request.method !== 'GET') {
        return handler();
    }

    // Skip caching in development for easier debugging
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_CACHE) {
        return handler();
    }

    const key = opts.keyGenerator(request, cacheKey);

    try {
        // Try to get cached response
        const cached = await CacheService.get<{ body: string; status: number; headers: Record<string, string> }>(key);

        if (cached) {
            logger.debug(`[ResponseCache] HIT: ${key}`);
            return new NextResponse(cached.body, {
                status: cached.status,
                headers: {
                    ...cached.headers,
                    'X-Cache': 'HIT',
                },
            }) as T;
        }

        // Execute handler
        const response = await handler();

        // Check if we should cache this response
        const shouldCache = await opts.shouldCache(response);
        if (!shouldCache) {
            logger.debug(`[ResponseCache] SKIP (shouldCache=false): ${key}`);
            return response;
        }

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let body: string;

        try {
            // Try to get JSON body
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const json = await clonedResponse.json();
                body = JSON.stringify(json);
            } else {
                body = await clonedResponse.text();
            }
        } catch {
            // If we can't read the body, don't cache
            logger.warn(`[ResponseCache] SKIP (unreadable body): ${key}`);
            return response;
        }

        // Build headers object (only safe headers)
        const headers: Record<string, string> = {};
        const safeHeaders = ['content-type', 'x-total-count', 'x-page', 'x-per-page'];
        safeHeaders.forEach((h) => {
            const value = response.headers.get(h);
            if (value) headers[h] = value;
        });

        // Cache the response
        await CacheService.set(key, { body, status: response.status, headers }, opts.ttl);

        // Add cache tags if provided
        if (opts.tags.length > 0) {
            for (const tag of opts.tags) {
                const tagKey = `api:cache:tag:${tag}`;
                const existing = await CacheService.get<string[]>(tagKey) || [];
                if (!existing.includes(key)) {
                    await CacheService.set(tagKey, [...existing, key], opts.ttl * 2);
                }
            }
        }

        logger.debug(`[ResponseCache] MISS (cached): ${key} (TTL: ${opts.ttl}s)`);

        // Return original response with cache header
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                ...Object.fromEntries(response.headers.entries()),
                'X-Cache': 'MISS',
            },
        }) as T;
    } catch (error) {
        logger.error(`[ResponseCache] Error for ${key}:`, error);
        // On cache error, fall through to handler
        return handler();
    }
}

/**
 * Invalidate cached responses by tag
 */
export async function invalidateCacheByTag(tag: string): Promise<void> {
    const tagKey = `api:cache:tag:${tag}`;
    const keys = await CacheService.get<string[]>(tagKey);

    if (keys && keys.length > 0) {
        await CacheService.mdel(keys);
        await CacheService.del(tagKey);
        logger.info(`[ResponseCache] Invalidated ${keys.length} entries for tag: ${tag}`);
    }
}

/**
 * Invalidate cached responses by pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
    await CacheService.invalidatePattern(`api:cache:${pattern}`);
    logger.info(`[ResponseCache] Invalidated pattern: ${pattern}`);
}

/**
 * Middleware helper: Add cache headers to response
 */
export function addCacheHeaders(response: NextResponse, ttl: number = 60): NextResponse {
    response.headers.set('X-Cache-Status', response.headers.get('X-Cache') || 'BYPASS');
    response.headers.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 10}`);
    return response;
}