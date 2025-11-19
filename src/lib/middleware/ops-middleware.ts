/**
 * Unified Ops Middleware
 * 
 * يجمع Metrics, Logging, و Tracing في middleware واحد
 * للاستخدام مع Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsMiddleware } from './metrics-middleware';
import { loggingMiddleware } from './logging-middleware';
import { tracingMiddleware } from './tracing-middleware';

/**
 * Middleware موحد يجمع جميع خدمات Ops
 * 
 * @param request - Next.js request
 * @param handler - API route handler
 * @returns NextResponse
 */
export async function opsMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // تطبيق middleware بالتسلسل:
  // 1. Tracing (يجب أن يكون أولاً لإنشاء context)
  // 2. Logging (للتسجيل مع context)
  // 3. Metrics (لتتبع المقاييس)
  
  return tracingMiddleware(
    request,
    async (req) => {
      return loggingMiddleware(
        req,
        async (r) => {
          return metricsMiddleware(r, handler);
        }
      );
    }
  );
}

/**
 * Helper function لاستخدام Ops middleware مع API routes
 * Improved with timeout protection and better error handling
 * 
 * مثال:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return opsWrapper(request, async (req) => {
 *     // API logic here
 *     return NextResponse.json({ data: 'result' });
 *   });
 * }
 * ```
 */
export function opsWrapper<T extends NextResponse>(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<T>
): Promise<T> {
  // Validate inputs
  if (!request || !handler || typeof handler !== 'function') {
    return Promise.resolve(
      NextResponse.json(
        { error: 'Invalid request or handler', code: 'INVALID_INPUT' },
        { status: 400 }
      ) as T
    );
  }

  // Wrap handler with timeout protection (60 seconds default)
  const handlerWithTimeout = async (req: NextRequest): Promise<T> => {
    const handlerPromise = handler(req);
    const timeoutPromise = new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(
          NextResponse.json(
            { error: 'Request timeout', code: 'REQUEST_TIMEOUT' },
            { status: 504 }
          ) as T
        );
      }, 60000); // 60 second timeout
    });

    return Promise.race([handlerPromise, timeoutPromise]);
  };

  try {
    return opsMiddleware(request, handlerWithTimeout) as Promise<T>;
  } catch (error) {
    // Fallback error handling if middleware fails
    return Promise.resolve(
      NextResponse.json(
        { 
          error: 'Middleware error', 
          code: 'MIDDLEWARE_ERROR',
          ...(process.env.NODE_ENV === 'development' && { 
            details: error instanceof Error ? error.message : 'Unknown error' 
          })
        },
        { status: 500 }
      ) as T
    );
  }
}

