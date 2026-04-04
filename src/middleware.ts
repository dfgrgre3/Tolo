import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
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
    const isApiRoute = pathname.startsWith('/api/');
    
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
    const isPublicPage = !isApiRoute && !isPublicAuthRoute;

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
    // -- AUTHENTICATION & IDENTITY EXTRACTION --
    const token = request.cookies.get('access_token')?.value;
    const hasRefreshToken = Boolean(request.cookies.get('refresh_token')?.value);
    let payload: TokenPayload | null = null;
    
    if (token) {
      payload = await TokenService.verifyToken<TokenPayload>(token);
    }

    // -- RATE LIMITING --
    // Run for all sub-requests except static assets to prevent abuse.
    // Enhanced: Use UserID for logged-in users, Fallback to IP.
    if (!isStaticAsset && isApiRoute) {
      try {
        const { apiRateLimiter, authRateLimiter } = await import('@/lib/rate-limit-unified');
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || (request as { ip?: string }).ip || 'unknown';
        
        // Identity-based rate limiting (Strategic for 1M+ users)
        const identifier = payload?.userId || ip;
        const isAuthApi = pathname.startsWith('/api/auth');
        
        // Wrap check with a safety timeout to prevent middleware hanging
        const checkPromise = isAuthApi 
          ? authRateLimiter.check(identifier, pathname) 
          : apiRateLimiter.check(identifier, pathname);
          
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const result = await Promise.race([checkPromise, timeoutPromise]);
        
        if (result) {
          const headers = {
            'X-RateLimit-Limit': (isAuthApi ? (payload ? 20 : 5) : 100).toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
          };

          if (!result.allowed) {
            logger.warn(`Rate limit exceeded for [${isAuthApi ? 'AUTH' : 'API'}] - ID: ${identifier} on ${pathname}`);
            return withSecurityHeaders(NextResponse.json(
              { 
                error: 'Too Many Requests', 
                message: result.lockedUntil ? 'Your account is temporarily locked due to too many failed attempts.' : 'Slow down, you are hitting the API too fast.'
              },
              { 
                status: 429,
                headers: {
                  ...headers,
                  'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
                }
              }
            ));
          }

          // Inject Rate Limit headers into request for downstream use
          Object.entries(headers).forEach(([k, v]) => requestHeaders.set(k.toLowerCase(), v));
        }
      } catch (rlError) {
        logger.error('Rate limit system error:', rlError);
      }
    }

    if (isStaticAsset || isPublicAuthApiRoute || isPublicPage) {
      return passthroughResponse;
    }

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAdminRoute = ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
    const isTeacherRoute = TEACHER_ROUTES.some((prefix) => pathname.startsWith(prefix));
    const requiresAuth = isProtected || isAdminRoute || isTeacherRoute;

    if (!payload) {
      if (isAuthPublicRoute(pathname)) {
        return passthroughResponse;
      }

      // Allow requests to pass if refresh token exists, so handler can attempt silent refresh
      if (hasRefreshToken && requiresAuth) {
        return passthroughResponse;
      }

      return requiresAuth ? handleUnauthorized(request, pathname) : passthroughResponse;
    }

    // -- User is AUTHENTICATED --

    // If on a public auth route (login/register), redirect to authenticated home
    if (isAuthPublicRoute(pathname)) {
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
    authHeaders.set('x-user-id', payload.userId as string);
    authHeaders.set('x-user-role', payload.role as string);
    
    if (payload.permissions && Array.isArray(payload.permissions)) {
      authHeaders.set('x-user-permissions', payload.permissions.join(','));
    }

    if (payload.sessionId) {
      authHeaders.set('x-session-id', payload.sessionId as string);
    }

    return decorateResponse(NextResponse.next({
      request: {
        headers: authHeaders,
      },
    }));
  } catch (error: unknown) {
    const errorLog = error instanceof Error ? error.message : 'Unknown middleware error';
    logger.error('Middleware Error:', errorLog);
    
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
    '/api/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/user/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/admin-login',
  ],
};
