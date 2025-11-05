/**
 * Logging Middleware
 * 
 * Middleware لتسجيل الطلبات HTTP وإرسالها إلى ELK Stack
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/elk-logger';

export async function loggingMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const route = url.pathname;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             request.headers.get('cf-connecting-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // محاولة استخراج userId من الـ token (إن وجد)
  let userId: string | undefined;
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // يمكن إضافة logic لاستخراج userId من الـ token
      // لكن هذا يتطلب الوصول إلى auth service
    }
  } catch {
    // تجاهل الخطأ
  }

  try {
    // تنفيذ الـ handler
    const response = await handler(request);
    
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // تسجيل الطلب
    logger.http({
      method,
      url: route,
      statusCode,
      duration,
      ip,
      userAgent,
      userId,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // تسجيل الخطأ
    logger.error('HTTP Request Error', error instanceof Error ? error : new Error(String(error)), {
      method,
      url: route,
      duration,
      ip,
      userAgent,
      userId,
    });

    throw error;
  }
}

