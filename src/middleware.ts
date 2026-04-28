import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * proxy.ts - Global Next.js Proxy & Middleware for Go Backend Integration.
 * 
 * In Next.js 16+, 'proxy.ts' replaces 'middleware.ts'.
 * This file handles session verification, route protection, and API rewrites.
 */

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
    '/admin-login'
  ]
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dfgrgre3-thanawy-secure-token-2026-v1-secret-key'
);

const INTERNAL_API_ORIGIN =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080/api';

const PROTECTED_PREFIXES = ['/user', '/settings', '/api/'];
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
  '/api/auth/me', 
  '/api/users/guest', 
  '/api/healthz', 
  '/api/readyz', 
  '/api/webhooks',
  '/api/courses', 
  '/api/courses/categories', 
  '/api/subjects', 
  '/api/teachers',
  '/api/exams'
];

const PUBLIC_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/admin-login'
];

/**
 * Main Proxy Handler
 * Renamed to 'proxy' to match Next.js 16 conventions.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. FAST PATH: Health checks & Static assets
  if (pathname === '/api/healthz' || pathname === '/api/readyz') {
    return NextResponse.next();
  }

  const isStaticAsset = pathname.includes('.') || pathname.includes('/_next/');
  if (isStaticAsset) return NextResponse.next();

  // 2. TRACING: Generate Request ID
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 3. INTERNAL HEADER PROTECTION (Spoof prevention)
  const internalHeaders = ['x-user-id', 'x-user-role', 'x-session-id'];
  internalHeaders.forEach((h) => requestHeaders.delete(h));

  // 4. AUTHENTICATION (Using Edge-compatible jose)
  const token = request.cookies.get('access_token')?.value;
  let payload: any = null;

  if (token) {
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
      payload = jwtPayload;
    } catch (err) {
      // Token invalid or expired
      payload = null;
    }
  }

  // 5. REDIRECT AUTHENTICATED USERS AWAY FROM AUTH PAGES
  if (payload && PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 6. ROUTE PROTECTION LOGIC
  const isPublicAuthApiRoute = PUBLIC_AUTH_API_ROUTES.includes(pathname) || 
                                 pathname.startsWith('/api/auth/oauth') ||
                                 pathname.startsWith('/api/auth/callback') ||
                                 pathname.startsWith('/api/courses/') || 
                                 pathname.startsWith('/api/subjects/');
  
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  
  const requiresAuth = !isPublicAuthApiRoute && !isPublicPage && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Redirect if unauthorized
  if (!payload && requiresAuth) {
    return handleUnauthorized(request, pathname);
  }

  // 7. RBAC & HEADER INJECTION
  if (payload) {
    const userRole = payload.role;
    const userId = payload.sub || payload.userId;

    if (ADMIN_ROUTES.some((p) => pathname.startsWith(p)) && userRole !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }
    if (TEACHER_ROUTES.some((p) => pathname.startsWith(p)) && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }

    if (userId) requestHeaders.set('x-user-id', String(userId));
    if (userRole) requestHeaders.set('x-user-role', String(userRole));
    if (payload.sessionId) requestHeaders.set('x-session-id', String(payload.sessionId));
  }

  // 8. TRUE REVERSE PROXY LOGIC
  // If it's an API route, rewrite it to the Go Backend
  if (pathname.startsWith('/api/')) {
    const backendUrl = new URL(pathname + request.nextUrl.search, INTERNAL_API_ORIGIN);
    
    const response = NextResponse.rewrite(backendUrl, {
      request: { headers: requestHeaders }
    });
    addSecurityHeaders(response, requestId);
    return response;
  }

  // 9. NORMAL NEXT.JS FLOW (For pages)
  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  addSecurityHeaders(response, requestId);
  return response;
}

// Default export for backward compatibility and Next.js expectation
export default proxy;

function handleUnauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

function handleForbidden(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.redirect(new URL('/unauthorized', request.url));
}

function addSecurityHeaders(response: NextResponse, requestId: string) {
  response.headers.set('x-request-id', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  // Content-Security-Policy can be quite restrictive, use with caution
  // response.headers.set('Content-Security-Policy', "default-src 'self'; upgrade-insecure-requests;");
}

