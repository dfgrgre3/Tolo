import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getBackendApiUrl } from '@/lib/api/backend-url';
import {
  CSRF_COOKIE_NAME,
  forwardSetCookies,
  validateCsrfCookieAttributes,
} from '@/lib/security/cookie-attrs';

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
  try {
    getBackendApiUrl('/auth/csrf');
  } catch (err) {
    logger.error('CSRF token bootstrap: backend URL not configured', err, { source: 'api/auth/csrf' });
    return NextResponse.json(
      { error: 'Backend service unavailable' },
      { status: 503 }
    );
  }

  try {
    logger.info('CSRF token bootstrap request', { source: 'api/auth/csrf' });

    const response = await fetch(getBackendApiUrl('/auth/csrf'), {
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
    
    // Forward Set-Cookie headers verbatim from the backend.
    //
    // `forwardSetCookies` centralizes dev-only `Secure` stripping
    // (so http://localhost still works) and validation that auth
    // cookies carry HttpOnly/Secure/SameSite. Previously this
    // route inlined a custom strip loop that only handled the
    // `Secure` attribute and silently trusted everything else.
    //
    forwardSetCookies({
      from: response,
      to: nextResponse,
      isCsrfCookie: (name) => name === CSRF_COOKIE_NAME,
      validateCookie: validateCsrfCookieAttributes,
      reportViolation: (name, violations) => {
        logger.warn('CSRF cookie missing required security attributes', {
          source: 'api/auth/csrf',
          cookie: name,
          violations,
        });
      },
    });

    return nextResponse;
  } catch (error) {
    logger.error('CSRF token bootstrap failed', error, { source: 'api/auth/csrf' });
    return NextResponse.json(
      { error: 'Failed to fetch CSRF token' },
      { status: 502 }
    );
  }
}
