import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Next.js Edge Middleware - Authentication & Security Gateway.
 * 
 * This middleware runs on the Edge Runtime for every matched request.
 * It handles three critical security functions:
 * 
 * 1. Route Protection: Ensures only authenticated users access protected routes
 * 2. Role-Based Access: Enforces ADMIN access on admin routes
 * 3. Security Headers: Adds defense-in-depth HTTP headers to all responses
 * 
 * Design Decision: We use Edge Middleware (not API middleware) because:
 * - It runs before the route handler, preventing any unauthorized code execution
 * - It's compatible with both Pages and API routes
 * - It uses the 'jose' library (Edge-compatible JWT verification)
 */

// Route Configuration
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PROTECTED_PREFIXES = ['/dashboard', '/user', '/api/protected'];
const ADMIN_ROUTES = ['/admin', '/api/admin'];
const TEACHER_ROUTES = ['/teacher'];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secret_fallback_key_production_ready'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ═══════════════════════════════════════════════════
  // 1. SECURITY HEADERS (Applied to ALL responses)
  // ═══════════════════════════════════════════════════
  addSecurityHeaders(response);

  // ═══════════════════════════════════════════════════
  // 2. BYPASS CHECK - Static resources & auth endpoints
  // ═══════════════════════════════════════════════════
  if (
    pathname.includes('/_next/') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    PUBLIC_ROUTES.includes(pathname)
  ) {
    return response;
  }

  // Determine route protection level
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  const isAdminRoute = ADMIN_ROUTES.some(prefix => pathname.startsWith(prefix));
  const isTeacherRoute = TEACHER_ROUTES.some(prefix => pathname.startsWith(prefix));

  // If route doesn't require protection, allow through
  if (!isProtected && !isAdminRoute && !isTeacherRoute) {
    return response;
  }

  // ═══════════════════════════════════════════════════
  // 3. TOKEN EXTRACTION & VERIFICATION
  // ═══════════════════════════════════════════════════
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return handleUnauthorized(request, pathname);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // ═══════════════════════════════════════════════════
    // 4. ROLE-BASED AUTHORIZATION
    // ═══════════════════════════════════════════════════
    if (isAdminRoute && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }

    if (isTeacherRoute && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
      return handleForbidden(request, pathname);
    }

    // ═══════════════════════════════════════════════════
    // 5. INJECT USER CONTEXT HEADERS
    // ═══════════════════════════════════════════════════
    // These headers are used by API routes via withAuth() helper
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-ID', payload.userId as string);
    requestHeaders.set('X-User-Role', payload.role as string);

    if (payload.sessionId) {
      requestHeaders.set('X-Session-ID', payload.sessionId as string);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Token is invalid or expired
    // For API routes, return 401; for pages, redirect to login
    return handleUnauthorized(request, pathname);
  }
}

/**
 * Handle unauthorized access (no token or invalid token).
 */
function handleUnauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid authentication required.' },
      { status: 401 }
    );
  }

  // Redirect to login preserving the original path
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

/**
 * Handle forbidden access (authenticated but insufficient role).
 */
function handleForbidden(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Forbidden. Insufficient permissions.' },
      { status: 403 }
    );
  }

  return NextResponse.redirect(new URL('/unauthorized', request.url));
}

/**
 * Add security headers to response.
 * Defense-in-depth approach to mitigate common web attacks.
 */
function addSecurityHeaders(response: NextResponse) {
  // Prevent MIME-type sniffing (reduces XSS risk)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by disabling iframes
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable basic XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict permissions/features the page can access
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
