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
  return opsMiddleware(request, handler) as Promise<T>;
}

