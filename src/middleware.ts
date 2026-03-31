
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimiter, authRateLimiter } from '@/lib/rate-limit';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { TokenService, TokenPayload } from '@/services/auth/token-service';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  isAuthPublicRoute,
  sanitizeRedirectPath,
} from '@/services/auth/navigation';

/**
 * middleware.ts - Global Next.js Middleware for professional authentication and security.
 * 
 * Design Goals:
 * 1. API Protection: Intercepts all private routes and validates JWT via TokenService.
 * 2. Role-based Access Control (RBAC): Redirects Unauthorized/Forbidden access.
 * 3. Header Injection: Passes userId, role, and permissions to downstream Route Handlers.
 * 4. Security: Injects curated security headers (CSP, HSTS, etc.) on all responses.
 */

const PROTECTED_PREFIXES = [
  '/user',
  '/settings',
  '/api/',
];
const ADMIN_ROUTES = ['/admin', '/api/admin'];
const TEACHER_ROUTES = ['/teacher'];
const PUBLIC_AUTH_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/oauth',
  '/api/auth/callback',
  '/api/auth/csrf',
  '/api/users/guest',
  '/api/healthz',
  '/api/readyz',
  '/api/webhooks',
  '/api/courses',
  '/api/courses/categories',
  '/api/subjects',
  '/api/teachers',
];

export default async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    
    // 1. Traceability: Generate or propagate Request ID
    let requestId = request.headers.get('x-request-id');
    if (!requestId) {
      try {
        requestId = crypto.randomUUID();
      } catch {
        requestId = Date.now().toString();
      }
    }
    
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    // -- ZERO TRUST: Sanitize critical internal headers --
    // Prevent client-side header injection/spoofing
    const internalHeaders = ['x-user-id', 'x-user-role', 'x-user-permissions', 'x-session-id', 'x-debug-mode'];
    internalHeaders.forEach(header => requestHeaders.delete(header));

    // Helper to add trace + security headers
    const decorateResponse = (res: NextResponse) => {
      res.headers.set('x-request-id', requestId!);
      addSecurityHeaders(res);
      return res;
    };

    const isPublicAuthRoute = isAuthPublicRoute(pathname);

    // Default response with headers
    const passthroughResponse = decorateResponse(NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }));

    // Skip logic for static assets and public auth endpoints
    const isPublicAuthApiRoute = PUBLIC_AUTH_API_ROUTES.includes(pathname);
    const isStaticAsset =
      pathname.includes('/_next/') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/public') ||
      pathname === '/favicon.ico' ||
      pathname.includes('.');

    // -- RATE LIMITING --
    // Run for all routes except static assets to prevent abuse
    if (!isStaticAsset) {
      const { success, headers } = await rateLimit(request);
      
      if (!success) {
        return withSecurityHeaders(NextResponse.json(
          { 
            error: 'Too Many Requests', 
            message: 'Enhance your calm. Please slow down.'
          },
          { 
            status: 429,
            headers
          }
        ));
      }

      // Inject Rate Limit headers into request for downstream use if needed
      Object.entries(headers).forEach(([k, v]) => requestHeaders.set(k.toLowerCase(), v));
    }

    if (isStaticAsset || isPublicAuthApiRoute) {
      return passthroughResponse;
    }

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAdminRoute = ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
    const isTeacherRoute = TEACHER_ROUTES.some((prefix) => pathname.startsWith(prefix));
    const requiresAuth = isProtected || isAdminRoute || isTeacherRoute;

    const token = request.cookies.get('access_token')?.value;
    const hasRefreshToken = Boolean(request.cookies.get('refresh_token')?.value);

    if (!token) {
      if (isPublicAuthRoute) {
        return passthroughResponse;
      }

      // Allow requests to pass if refresh token exists, so handler can attempt silent refresh
      if (hasRefreshToken && requiresAuth) {
        return passthroughResponse;
      }

      return requiresAuth ? handleUnauthorized(request, pathname) : passthroughResponse;
    }

    // Verification phase using Unified TokenService
    const payload = await TokenService.verifyToken<TokenPayload>(token);

    if (payload) {
      // -- User is AUTHENTICATED --

      // If on a public auth route (login/register), redirect to authenticated home
      if (isPublicAuthRoute) {
        const requestedRedirect = sanitizeRedirectPath(
          request.nextUrl.searchParams.get('redirect'),
          DEFAULT_AUTHENTICATED_ROUTE
        );
        return withSecurityHeaders(NextResponse.redirect(new URL(requestedRedirect, request.url)));
      }

      // RBAC: Check for roles
      if (isAdminRoute && payload.role !== 'ADMIN') {
        return handleForbidden(request, pathname);
      }

      if (isTeacherRoute && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
        return handleForbidden(request, pathname);
      }

      // Header Injection: Prepare request headers for Route Handlers
      const authHeaders = new Headers(request.headers);
      authHeaders.set('x-user-id', payload.userId);
      authHeaders.set('x-user-role', payload.role);
      
      if (payload.permissions && Array.isArray(payload.permissions)) {
        authHeaders.set('x-user-permissions', payload.permissions.join(','));
      }

      if (payload.sessionId) {
        authHeaders.set('x-session-id', payload.sessionId);
      }

      const authenticatedResponse = decorateResponse(NextResponse.next({
        request: {
          headers: authHeaders,
        },
      }));

      return authenticatedResponse;
    }

    // -- User Token is INVALID or EXPIRED --

    if (isPublicAuthRoute) {
      return passthroughResponse;
    }

    // Permit navigation if refresh token exists (for silent refresh fallback in handlers)
    if (hasRefreshToken && requiresAuth) {
      return passthroughResponse;
    }

    return requiresAuth ? handleUnauthorized(request, pathname) : passthroughResponse;
  } catch (error) {
    console.error('Middleware Error:', error);
    
    // Fallback for API routes to always return JSON
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal Server Error (Middleware)', code: 'MIDDLEWARE_ERROR' },
        { status: 500 }
      );
    }
    
    // Fallback for other routes
    return NextResponse.next();
  }
}

function handleUnauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return withSecurityHeaders(NextResponse.json(
      { error: 'Unauthorized. Valid authentication required.' },
      { status: 401 }
    ));
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname.startsWith('/admin') ? '/admin-login' : '/login';

  const fullPath = `${pathname}${request.nextUrl.search}`;
  url.searchParams.set('redirect', sanitizeRedirectPath(fullPath));

  return withSecurityHeaders(NextResponse.redirect(url));
}

function handleForbidden(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return withSecurityHeaders(NextResponse.json(
      { error: 'Forbidden. Insufficient permissions.' },
      { status: 403 }
    ));
  }

  return withSecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)));
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy (CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google-analytics.com https://*.googleapis.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.cloudinary.com https://*.google-analytics.com https://*.gravatar.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.google-analytics.com https://*.googleapis.com ws: wss:;
    frame-src 'self' https://*.youtube.com https://*.vimeo.com https://*.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
