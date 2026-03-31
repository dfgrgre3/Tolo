import redisService from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Distributed Redis-based Rate Limiter.
 * Production-proven for massive traffic.
 */
export async function rateLimit(
  req: NextRequest, 
  limit: number = 60, 
  windowSec: number = 60
): Promise<{ success: boolean; headers: Record<string, string> }> {
  try {
    // Safely extract IP across different Next.js environments
    const ip = (req as any).ip || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const key = `ratelimit:${ip}:${req.nextUrl.pathname}`;
    const redis = await redisService.getClient();
    
    // FAIL OPEN: If Redis client is null (e.g. Edge runtime doesn't support ioredis),
    // allow the request and log the missing client if in development.
    if (!redis) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`Redis unavailable in current runtime (${process.env.NEXT_RUNTIME || 'unknown'}). Rate limiting bypassed (FAIL-OPEN).`);
      }
      return { success: true, headers: {} };
    }

    // 1. Atomic Increment and Expiry check
    const results = await redis.multi()
      .incr(key)
      .expire(key, windowSec, 'NX')
      .exec();
    
    if (!results || !Array.isArray(results) || !results[0]) {
      throw new Error('Redis pipeline execution failed');
    }
    
    // Handle diff result formats between standard and other redis library versions
    const count = (Array.isArray(results[0]) ? results[0][1] : results[0]) as number;

    const remaining = Math.max(0, limit - (count as number));
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + windowSec).toString()
    };

    if ((count as number) > limit) {
      logger.warn(`Rate limit exceeded for IP: ${ip} on ${req.nextUrl.pathname}`);
      return { success: false, headers };
    }

    return { success: true, headers };
  } catch (error) {
    logger.error('Rate Limiter Error:', error);
    // Fail Open: Don't block users if Redis is down, but log the failure
    return { success: true, headers: {} };
  }
}

/**
 * Middleware Helper for API Routes
 */
export async function withRateLimit(req: NextRequest, handler: () => Promise<NextResponse>) {
  const { success, headers } = await rateLimit(req);

  if (!success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Enhance your calm. Please slow down.' },
      { status: 429, headers }
    );
  }

  const response = await handler();
  
  // Add rate limit headers to the success response
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  
  return response;
}
