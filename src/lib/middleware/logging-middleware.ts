/**
 * Logging Middleware
 * Provides request/response logging for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface LoggingOptions {
  logBody?: boolean;
  logHeaders?: boolean;
  logResponse?: boolean;
}

/**
 * Logging middleware for API routes
 */
export async function loggingMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: LoggingOptions = {}
): Promise<NextResponse> {
  const startTime = Date.now();
  const { logBody = false, logHeaders = false, logResponse = false } = options;

  // Log request
  const requestLog: any = {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
  };

  if (logHeaders) {
    requestLog.headers = Object.fromEntries(request.headers.entries());
  }

  if (logBody && request.method !== 'GET') {
    try {
      const body = await request.clone().json();
      requestLog.body = body;
    } catch (_error) {
      // Body might not be JSON
    }
  }

  logger.info('Incoming request:', requestLog);

  try {
    // Execute handler
    const response = await handler(request);

    // Log response
    const duration = Date.now() - startTime;
    const responseLog: any = {
      status: response.status,
      duration: `${duration}ms`,
    };

    if (logResponse) {
      try {
        const responseBody = await response.clone().json();
        responseLog.body = responseBody;
      } catch (_error) {
        // Response might not be JSON
      }
    }

    logger.info('Response sent:', responseLog);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Request failed:', {
      error,
      duration: `${duration}ms`,
    });
    throw error;
  }
}
