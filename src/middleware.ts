import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { TokenService, TokenPayload } from './services/auth/token-service';
import { CacheService } from './lib/cache';
import {

  isAuthPublicRoute } from

'./services/auth/navigation';

/**
 * middleware.ts - Global Next.js Middleware Optimized for 10M+ Users.
 * 
 * Performance Strategies:
 * 1. Runtime: Node.js (allows ioredis for high-speed TCP connection to local Redis).
 * 2. Caching: O(1) Session validation against Redis.
 * 3. Fast Path: Health check and static assets extraction.
 * 4. Zero Trust: Sanitize internal headers.
 */

export const config = {
  // Use Node.js runtime for full ioredis support and high-performance TCP caching
  runtime: 'nodejs',
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
  '/admin-login']

};

const PROTECTED_PREFIXES = ['/user', '/settings', '/api/'];
const ADMIN_ROUTES = ['/admin', '/api/admin'];
const TEACHER_ROUTES = ['/teacher'];
const PUBLIC_AUTH_API_ROUTES = [
'/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
'/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/resend-verification',
'/api/auth/refresh', '/api/auth/logout', '/api/auth/oauth', '/api/auth/callback',
'/api/auth/csrf', '/api/users/guest', '/api/healthz', '/api/readyz', '/api/webhooks',
'/api/courses', '/api/courses/categories', '/api/subjects', '/api/teachers'];


export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const _isApiRoute = pathname.startsWith('/api/');

  // 1. FAST PATH: Health checks (Bypass for K8s)
  if (pathname === '/api/healthz' || pathname === '/api/readyz') {
    return NextResponse.next();
  }

  // 2. TRACING: Generate Request ID
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 3. INTERNAL HEADER PROTECTION (Spoof prevention)
  const internalHeaders = ['x-user-id', 'x-user-role', 'x-user-permissions', 'x-session-id'];
  internalHeaders.forEach((h) => requestHeaders.delete(h));

  // 4. AUTHENTICATION & SESSION CACHING
  const token = request.cookies.get('access_token')?.value;
  let payload: TokenPayload | null = null;

  if (token) {
    // 4.1 Cryptographic verification
    payload = await TokenService.verifyToken<TokenPayload>(token);

    // 4.2 Distributed Revocation Check (Million-User Scale Security)
    if (payload?.sessionId) {
      const cacheKey = `session:${payload.sessionId}`;
      const cachedSession = await CacheService.get<any>(cacheKey);

      // If session is revoked or missing from cache (TTL exceeded), we block
      // Note: Real-world apps might fallback to DB if cache is missing, but for 10M users
      // strict Cache-Aside is safer for performance.
      if (!cachedSession || !cachedSession.isActive) {
        payload = null; // Mark as unauthorized
      }
    }
  }

  // 5. ROUTE PROTECTION
  const isPublicAuthApiRoute = PUBLIC_AUTH_API_ROUTES.includes(pathname) || 
                               pathname.startsWith('/api/courses/') || 
                               pathname.startsWith('/api/subjects/');
  const _isPublicAuthRoute = isAuthPublicRoute(pathname);
  const isStaticAsset = pathname.includes('.') || pathname.includes('/_next/');
  const requiresAuth = !isStaticAsset && !isPublicAuthApiRoute && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!payload && requiresAuth) {
    return handleUnauthorized(request, pathname);
  }

  // 6. RBAC (Role Based Access Control)
  if (payload) {
    if (ADMIN_ROUTES.some((p) => pathname.startsWith(p)) && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }
    if (TEACHER_ROUTES.some((p) => pathname.startsWith(p)) && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }
  }

  // 7. HEADER INJECTION for downstream Route Handlers
  if (payload) {
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    if (payload.sessionId) requestHeaders.set('x-session-id', payload.sessionId);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  // 8. SECURITY & CACHING HEADERS
  addSecurityHeaders(response, requestId);
  addCachingHeaders(request, response);

  return response;
}

/**
 * Caching Strategy for 10M+ Users:
 * Offload public metadata queries to the edge (CDN/Browser)
 */
function addCachingHeaders(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;

  // Public content (Subjects, Courses, Lessons) - Cache at edge for 1 minute, allow stale for 1 hour
  const PUBLIC_METADATA_ROUTES = ['/api/subjects', '/api/courses', '/api/lessons'];
  if (PUBLIC_METADATA_ROUTES.some((p) => pathname.startsWith(p))) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=3600');
  }

  // Static assets (Next.js internals, public folder) - Cache forever
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/public/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

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
  response.headers.set('Content-Security-Policy', "default-src 'self'; upgrade-insecure-requests;");
}