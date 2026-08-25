import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * CSRF Token Bootstrap Endpoint
 * 
 * This endpoint ensures the browser receives a _csrf cookie before making
 * state-changing requests. It calls the backend's /api/auth/csrf endpoint
 * which uses middleware.EnsureCSRFToken to set the cookie and X-CSRF-Token header.
 * 
 * The frontend apiClient calls this before POST/PUT/PATCH/DELETE requests to
 * implement the Double Submit Cookie pattern.
 */
export async function GET(_request: NextRequest) {
  const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082';

  try {
    logger.info('CSRF token bootstrap request', { source: 'api/auth/csrf' });

    const response = await fetch(`${backendUrl}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(10_000),
    });

    logger.info('CSRF token bootstrap response', { 
      source: 'api/auth/csrf', 
      statusCode: response.status,
      hasCsrfHeader: !!response.headers.get('X-CSRF-Token')
    });

    // Forward the response with CSRF headers and cookies
    const nextResponse = NextResponse.json({}, { status: response.status });
    
    // Forward X-CSRF-Token if present
    const csrfToken = response.headers.get('X-CSRF-Token');
    if (csrfToken) {
      nextResponse.headers.set('X-CSRF-Token', csrfToken);
    }
    
    // Forward Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',').filter(Boolean) || [];
    for (const cookie of setCookieHeaders) {
      // In development, remove Secure flag to allow HTTP cookies
      const cookieValue = process.env.NODE_ENV === 'development' 
        ? cookie.split(';').filter(part => part.trim().toLowerCase() !== 'secure').join(';')
        : cookie;
      nextResponse.headers.append('Set-Cookie', cookieValue);
    }

    return nextResponse;
  } catch (error) {
    logger.error('CSRF token bootstrap failed', error, { source: 'api/auth/csrf' });
    return NextResponse.json(
      { error: 'Failed to fetch CSRF token' },
      { status: 502 }
    );
  }
}
