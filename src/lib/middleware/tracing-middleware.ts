/**
 * Tracing Middleware
 * 
 * Middleware لتتبع الطلبات HTTP مع Jaeger
 */

import { NextRequest, NextResponse } from 'next/server';
import { traceAsync, extractContext, injectContext } from '@/lib/tracing/jaeger-tracer';

export async function tracingMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;
  const url = new URL(request.url);
  const route = url.pathname;

  // استخراج context من headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const _parentContext = extractContext(headers);

  // إنشاء span للطلب
  return traceAsync(
    `HTTP ${method} ${route}`,
    async (span) => {
      // إضافة attributes
      span.setAttribute('http.method', method);
      span.setAttribute('http.url', route);
      span.setAttribute('http.route', route);
      span.setAttribute('http.user_agent', request.headers.get('user-agent') || 'unknown');
      span.setAttribute('http.ip', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');

      try {
        // تنفيذ الـ handler
        const response = await handler(request);

        const statusCode = response.status;
        span.setAttribute('http.status_code', statusCode);
        span.setAttribute('http.status_text', response.statusText);

        // إضافة tracing headers إلى الاستجابة
        const tracingHeaders = injectContext({});
        Object.entries(tracingHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      } catch (error) {
        span.setAttribute('error', true);
        span.setAttribute('error.message', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    {
      'http.method': method,
      'http.url': route,
    }
  );
}

