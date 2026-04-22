/**
 * Metrics Middleware
 * 
 * Middleware لتتبع الطلبات HTTP وإرسال المقاييس إلى Prometheus
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackHttpRequest } from '@/lib/metrics/prometheus';

export async function metricsMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const route = url.pathname;
  
  // حساب حجم الطلب (إن أمكن)
  let requestSize = 0;
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      requestSize = parseInt(contentLength, 10);
    }
  } catch {
    // تجاهل الخطأ
  }

  try {
    // تنفيذ الـ handler
    const response = await handler(request);
    
    const duration = Date.now() - startTime;
    const statusCode = response.status;
    
    // حساب حجم الاستجابة (إن أمكن)
    let responseSize = 0;
    try {
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        responseSize = parseInt(contentLength, 10);
      }
    } catch {
      // تجاهل الخطأ
    }

    // تتبع المقاييس
    trackHttpRequest(method, route, statusCode, duration, requestSize, responseSize);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = 500;
    
    // تتبع الخطأ
    trackHttpRequest(method, route, statusCode, duration, requestSize);

    throw error;
  }
}

