import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// ==================== Clerk Auth Configuration ====================

// /admin routes are protected by the (admin) layout's AdminGuard (JWT auth)
// using the project's auth-context. They must NOT be protected by Clerk,
// otherwise users would be forced to authenticate twice.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/my-courses(.*)',
  '/billing(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/admin-login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/reset-password(.*)',
  '/verify-email(.*)',
  '/courses(.*)',
  '/api(.*)',
  '/_next(.*)',
  '/static(.*)',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]);

// ==================== Proxy Configuration ====================

const BACKEND_URL = (() => {
  const url = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8082'
  ).replace(/\/api$/, '');

  if (!url.startsWith('http')) {
    return `http://${url}`;
  }
  return url;
})();

const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT || '30000', 10); // 30 seconds
const ENABLE_LOGGING = process.env.PROXY_LOGGING === 'true';

// Static asset patterns to skip proxying
const STATIC_ASSET_PATTERNS = [
  /\.(png|jpg|jpeg|gif|ico|svg|webp|js|css|woff|woff2|ttf|eot|mp4|webm|ogg)$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/manifest\.json$/,
];

const SKIP_PATHS = [
  '/_next/',
  '/static/',
  '/.well-known/',
];

// ==================== Request/Response Types ====================

interface ProxyOptions {
  timeout?: number;
  headers?: Record<string, string>;
  stripHeaders?: string[];
}

interface ProxyLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  error?: string;
}

// ==================== Logger ====================

class ProxyLogger {
  private logs: ProxyLog[] = [];
  private maxLogs = 100;

  log(entry: ProxyLog) {
    if (!ENABLE_LOGGING) return;

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const logMessage = `[PROXY] ${entry.timestamp} ${entry.method} ${entry.path} → ${entry.status} (${entry.duration}ms)`;
    if (entry.error) {
      console.error(`${logMessage} - Error: ${entry.error}`);
    } else {
      console.log(logMessage);
    }
  }

  getLogs(): ProxyLog[] {
    return [...this.logs];
  }
}

const logger = new ProxyLogger();

// ==================== Utility Functions ====================

/**
 * Check if path should be skipped from proxying
 */
function shouldSkipProxy(pathname: string): boolean {
  // Never skip proxy for admin routes (including their assets)
  if (pathname.startsWith('/admin/') || pathname === '/admin') {
    return false;
  }

  // Skip local API endpoints so they are handled by Next.js local route handlers
  if (pathname === '/api/analytics/web-vitals' || pathname === '/api/cache/revalidate') {
    return true;
  }

  // Skip internal paths
  if (SKIP_PATHS.some(p => pathname.startsWith(p))) {
    return true;
  }

  // Skip static assets
  if (STATIC_ASSET_PATTERNS.some(p => p.test(pathname))) {
    return true;
  }

  return false;
}

/**
 * Filter sensitive headers
 */
function filterHeaders(headers: Headers, stripHeaders: string[] = []): Headers {
  const filtered = new Headers(headers);
  const sensitiveHeaders = [
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
    ...stripHeaders,
  ];

  sensitiveHeaders.forEach(header => {
    filtered.delete(header);
  });

  return filtered;
}

/**
 * Build backend URL with path and query
 */
function buildBackendUrl(pathname: string, search: string): URL {
  const url = new URL(pathname, BACKEND_URL);
  url.search = search;
  return url;
}

/**
 * Create abort controller with timeout
 */
function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Extract and preserve cookies
 */
function preserveCookies(request: NextRequest, response: Response, headers: Headers) {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    headers.set('set-cookie', setCookie);
  }

  return headers;
}

/**
 * Handle response based on content type
 */
async function handleResponse(
  response: Response,
  request: NextRequest,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const contentType = response.headers.get('content-type') || '';
  const responseHeaders = filterHeaders(response.headers, options.stripHeaders);

  // Preserve cookies
  preserveCookies(request, response, responseHeaders);

  // Handle JSON responses
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 502, headers: responseHeaders }
      );
    }
  }

  // Handle streaming responses (video, downloads, etc.)
  if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  // Handle text responses
  if (contentType.includes('text/') || contentType.includes('application/')) {
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  // Default: return as is
  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

// ==================== Main Proxy Handler ====================

/**
 * Proxy API requests to backend
 */
async function handleApiProxy(
  request: NextRequest,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;
  const timeout = options.timeout || PROXY_TIMEOUT;

  try {
    // Build backend URL
    const backendUrl = buildBackendUrl(pathname, search);

    // Create abort controller with timeout
    const { controller, timeoutId } = createTimeoutController(timeout);

    // Prepare request headers
    const requestHeaders = filterHeaders(request.headers);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               '127.0.0.1';
    requestHeaders.set('x-forwarded-for', ip);
    requestHeaders.set('x-forwarded-proto', request.nextUrl.protocol.slice(0, -1));
    requestHeaders.set('x-forwarded-host', request.nextUrl.host);

    // Execute proxy request with duplex: 'half' for Node 18+ compatibility with ReadableStream bodies
    const response = await fetch(backendUrl.toString(), {
      method: request.method,
      headers: requestHeaders,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      signal: controller.signal,
      // @ts-ignore
      duplex: 'half',
    });
    clearTimeout(timeoutId);

    // Handle response
    const result = await handleResponse(response, request, options);

    // Log successful request
    const duration = Date.now() - startTime;
    logger.log({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: pathname,
      status: response.status,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const causeMessage = error instanceof Error && (error as any).cause ? String((error as any).cause) : '';
    const fullErrorMessage = `${errorMessage} ${causeMessage}`;

    // Log error
    logger.log({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: pathname,
      status: 502,
      duration,
      error: fullErrorMessage,
    });

    // Handle timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Request timeout',
          message: `Backend request exceeded ${timeout}ms timeout`,
        },
        { status: 504 }
      );
    }

    // Handle connection errors
    if (fullErrorMessage.includes('ECONNREFUSED') || fullErrorMessage.includes('ENOTFOUND') || fullErrorMessage.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'Backend service unavailable',
          message: 'Could not connect to backend service. Please make sure the backend is running.',
        },
        { status: 503 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Proxy error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred',
      },
      { status: 502 }
    );
  }
}

// ==================== Health Check ====================

/**
 * Check backend health
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const { controller, timeoutId } = createTimeoutController(5000);
    const response = await fetch(`${BACKEND_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// ==================== Main Proxy + Clerk Auth Handler ====================

/**
 * Middleware that combines Clerk authentication with API proxying.
 * Next.js 16+ expects this as the default export from the proxy file.
 */
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // 2. Skip proxy for static assets and internal paths
  if (shouldSkipProxy(pathname)) {
    return NextResponse.next();
  }

  // 3. API routes: let Next.js route handlers handle them.
  // The catch-all src/app/api/[...path]/route.ts proxies to the backend at
  // request time (using resolveBackendUrl()) so it reliably picks up
  // INTERNAL_API_URL / NEXT_PUBLIC_API_URL from the Vercel serverless env.
  // Middleware runs on Edge and resolves env vars at module init, so using
  // BACKEND_URL here caused 503s when the variable wasn't available at cold start.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Admin routes via proxy
  if (pathname.startsWith('/admin/') || pathname === '/admin') {
    return handleApiProxy(req);
  }

  // 4. Handle health check
  if (pathname === '/health' || pathname === '/healthz') {
    const isHealthy = await checkBackendHealth();
    return NextResponse.json(
      { status: isHealthy ? 'healthy' : 'unhealthy' },
      { status: isHealthy ? 200 : 503 }
    );
  }

  // 5. Default: proceed with Next.js routing
  return NextResponse.next();
});

// ==================== Configuration ====================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|uploads).*)',
  ],
};