import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  isAuthPublicRoute,
  sanitizeRedirectPath,
} from '@/lib/auth/navigation';

const PROTECTED_PREFIXES = ['/dashboard', '/user', '/settings', '/api/protected'];
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
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secret_fallback_key_production_ready'
);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAuthRoute = isAuthPublicRoute(pathname);

  const passthroughResponse = NextResponse.next();
  addSecurityHeaders(passthroughResponse);

  const isPublicAuthApiRoute = PUBLIC_AUTH_API_ROUTES.includes(pathname);
  const isStaticAsset =
    pathname.includes('/_next/') ||
    pathname === '/favicon.ico';

  if (isStaticAsset || isPublicAuthApiRoute) {
    return passthroughResponse;
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAdminRoute = ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
  const isTeacherRoute = TEACHER_ROUTES.some((prefix) => pathname.startsWith(prefix));
  const requiresAuth = isProtected || isAdminRoute || isTeacherRoute;

  const token = request.cookies.get('access_token')?.value;
  const hasRefreshToken = Boolean(request.cookies.get('refresh_token')?.value);
  const isPageRequest = !pathname.startsWith('/api/');

  if (!token) {
    if (isPublicAuthRoute) {
      return passthroughResponse;
    }

    // If refresh token exists, let client restore session without forcing a login redirect.
    if (hasRefreshToken && requiresAuth && isPageRequest) {
      return passthroughResponse;
    }

    return requiresAuth ? handleUnauthorized(request, pathname) : passthroughResponse;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (isPublicAuthRoute) {
      const requestedRedirect = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirect'),
        DEFAULT_AUTHENTICATED_ROUTE
      );

      return withSecurityHeaders(NextResponse.redirect(new URL(requestedRedirect, request.url)));
    }

    if (isAdminRoute && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }

    if (isTeacherRoute && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-ID', payload.userId as string);
    requestHeaders.set('X-User-Role', payload.role as string);
    
    if (payload.permissions && Array.isArray(payload.permissions)) {
      requestHeaders.set('X-User-Permissions', payload.permissions.join(','));
    }

    if (payload.sessionId) {
      requestHeaders.set('X-Session-ID', payload.sessionId as string);
    }

    const authenticatedResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    addSecurityHeaders(authenticatedResponse);
    return authenticatedResponse;
  } catch {
    if (isPublicAuthRoute) {
      return passthroughResponse;
    }

    // Expired/invalid access token with refresh token available:
    // allow protected page requests to pass so client can refresh tokens in background.
    if (hasRefreshToken && requiresAuth && isPageRequest) {
      return passthroughResponse;
    }

    return requiresAuth ? handleUnauthorized(request, pathname) : passthroughResponse;
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
