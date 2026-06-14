import { NextRequest, NextResponse } from 'next/server';
import { POST as webVitalsPost } from '../analytics/web-vitals/route';
import { POST as revalidatePost } from '../cache/revalidate/route';

// =============================================================================
// Configuration
// =============================================================================

// Explicit Node.js runtime. Next.js App Router sometimes picks the Edge
// runtime for catch-all routes which has different fetch behaviour
// (no streaming bodies, smaller body limit, no global fetch extensions).
// We need a stable, streaming-friendly fetch for proxying POST/PUT/PATCH/DELETE
// to the Go backend, so force Node.js.
export const runtime = 'nodejs';

// `force-dynamic` ensures the route is never statically optimised/cached.
// Every /api/* request must hit the backend live.
export const dynamic = 'force-dynamic';

// Default Vercel Function maxDuration is 10s on Hobby, 60s on Pro, 900s on
// Enterprise. Bumping to 30s gives us enough headroom for:
//   cold start (1-3s) + Clerk middleware (0.5s) + Go backend (1-5s)
//   + the extra round-trip to vercel.app (1-3s when same region).
// 30s is well within the Pro plan limit.
export const maxDuration = 30;

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Hard timeout for requests before failing fast to avoid blocking serverless threads.
const FETCH_TIMEOUT_MS = 20000;

// =============================================================================
// Backend URL resolution (request-time, NOT module-load time)
// =============================================================================

/**
 * Resolve the backend base URL at request-time (NOT at module-load time).
 *
 * Vercel deployments must have one of these set in Project Settings → Environment Variables:
 *   - INTERNAL_API_URL   = https://your-backend.vercel.app          (preferred, server-to-server)
 *   - NEXT_PUBLIC_API_URL = https://your-backend.vercel.app/api     (exposed to the client)
 *
 * If neither is set the proxy falls back to 127.0.0.1:8082 which does NOT
 * exist on Vercel's serverless runtime → 502 "Failed to connect to backend".
 *
 * We log the resolved value on first use so it shows up in `vercel logs`.
 */
function resolveBackendUrl(): string {
  const raw =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    '';

  // Strip a trailing /api and trailing slashes so we can re-append /api/<path>.
  const cleaned = raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  if (!cleaned) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const fallback = isProd ? '' : 'http://127.0.0.1:8082';

    if (isProd) {
      // Loud, structured error so the issue shows up immediately in Vercel logs.
      console.error(
        '[API Proxy] FATAL: No backend URL configured in production. ' +
        'Set INTERNAL_API_URL or NEXT_PUBLIC_API_URL in Vercel Environment Variables. ' +
        'Every /api/* request will return 502 until this is fixed.'
      );
    } else {
      console.warn(
        '[API Proxy] No INTERNAL_API_URL / NEXT_PUBLIC_API_URL set; ' +
        'using development fallback http://127.0.0.1:8082'
      );
    }

    return fallback;
  }

  return cleaned;
}

let loggedBackendUrl: string | null = null;
function getBackendUrl(): string {
  const url = resolveBackendUrl();
  if (loggedBackendUrl !== url) {
    console.log(`[API Proxy] Resolved BACKEND_URL = ${url || '(empty - will 502)'}`);
    loggedBackendUrl = url;
  }
  return url;
}

// =============================================================================
// Header helpers
// =============================================================================

function upstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  let auth = request.headers.get('authorization');
  if (!auth) {
    try {
      const url = new URL(request.url);
      const token = url.searchParams.get('token');
      if (token) {
        auth = `Bearer ${token}`;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  if (auth) headers['Authorization'] = auth;

  const cookie = request.headers.get('cookie');
  if (cookie) {
    // Filter out Clerk cookies to avoid conflicts and header bloat
    const cleanedCookies = cookie
      .split(';')
      .map(c => c.trim())
      .filter(c => !c.startsWith('__clerk') && !c.startsWith('__client') && !c.startsWith('__session'))
      .join('; ');
    if (cleanedCookies) {
      headers['Cookie'] = cleanedCookies;
    }
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (ip) headers['x-forwarded-for'] = ip;

  // Forward CSRF token
  const csrf = request.headers.get('x-csrf-token');
  if (csrf) headers['X-CSRF-Token'] = csrf;

  // Forward content type
  const ct = request.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  // Tell the backend NOT to compress its response.
  // The proxy reads the body as an ArrayBuffer (Node fetch auto-decompresses),
  // so if the backend sends gzip the Content-Length will be wrong and the
  // browser will throw ERR_CONTENT_DECODING_FAILED.
  headers['Accept-Encoding'] = 'identity';

  return headers;
}

// =============================================================================
// Body handling
// =============================================================================


// =============================================================================
// Fetch with timeout + retry
// =============================================================================

/**
 * fetch() with a hard timeout. We fail fast and let the client-side
 * (e.g., TanStack React Query) handle retry logic, avoiding serverless
 * execution billing overhead.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Response header helpers
// =============================================================================

function copyResponseHeaders(response: Response, defaultCacheControl?: string): Headers {
  const responseHeaders = new Headers();
  const excludeHeaders = [
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade',
    // Always strip content-encoding and content-length: the proxy decompresses
    // the body (Node.js fetch does this automatically) so these headers no
    // longer match the forwarded body, which causes ERR_CONTENT_DECODING_FAILED.
    'content-encoding', 'content-length',
  ];

  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'set-cookie') return;
    if (!excludeHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value);
    }
  });

  if (response.headers.has('set-cookie')) {
    const setCookieHeaders = typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean) as string[];

    setCookieHeaders.forEach((cookieVal: string) => {
      responseHeaders.append('Set-Cookie', cookieVal);
    });
  }

  if (!responseHeaders.has('content-type')) {
    responseHeaders.set('content-type', response.headers.get('content-type') || 'application/json');
  }

  if (defaultCacheControl && !responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', response.headers.get('cache-control') || defaultCacheControl);
  }

  return responseHeaders;
}

function handleErrorResponse(response: Response, errorText: string) {
  let errorData;
  try {
    errorData = JSON.parse(errorText);
    // Ensure we always have an error field
    if (!errorData.error && errorData.message) {
      errorData.error = errorData.message;
    }
    if (!errorData.error && errorData.msg) {
      errorData.error = errorData.msg;
    }
    if (!errorData.error) {
      errorData.error = `Backend error (HTTP ${response.status})`;
    }
  } catch {
    errorData = {
      error: response.status === 404 ? 'Resource not found on backend' : 'Backend error',
      status: response.status,
      details: errorText.substring(0, 500)
    };
  }
  // Always include status in response
  errorData.status = response.status;

  const responseHeaders = copyResponseHeaders(response);

  return NextResponse.json(errorData, {
    status: response.status,
    headers: responseHeaders
  });
}

// =============================================================================
// Main handler
// =============================================================================

async function handleProxy(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const params = await props.params;
  const path = params.path.join('/');

  // Bypass media/storage files to avoid memory buffering proxy overhead and redirect directly to Supabase CDN
  if (params.path[0] === 'storage') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vowortqooklkavlaqigr.supabase.co';
    const { search } = new URL(request.url);
    const redirectUrl = `${supabaseUrl}/storage/${params.path.slice(1).join('/')}${search}`;
    console.log(`[API Proxy] Media redirect: /api/${path} -> ${redirectUrl}`);
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  // Bypass: local analytics & revalidation routes are handled by their own
  // route handlers and must not be proxied upstream.
  if (path === 'analytics/web-vitals') {
    if (request.method === 'POST') {
      return webVitalsPost(request);
    }
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (path === 'cache/revalidate') {
    if (request.method === 'POST') {
      return revalidatePost(request);
    }
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { search } = new URL(request.url);
  const backendUrl = getBackendUrl();

  // Fail fast with a clear 503 if no backend is configured.
  // This makes the root cause obvious in browser DevTools (and avoids
  // a confusing generic 502 from fetch's network error).
  if (!backendUrl) {
    console.error(
      `[API Proxy] Refusing ${request.method} /api/${path} - no backend URL configured. ` +
      `Set INTERNAL_API_URL or NEXT_PUBLIC_API_URL in Vercel Environment Variables.`
    );
    return NextResponse.json(
      {
        error: 'Backend service unavailable',
        details:
          'The frontend is missing INTERNAL_API_URL / NEXT_PUBLIC_API_URL. ' +
          'Configure it in Vercel → Project Settings → Environment Variables.',
      },
      { status: 503 }
    );
  }

  // Connect-RPC routes are registered under both root and /api/ prefixes on the backend.
  // We route them under /api/ here so that Vercel serverless routing forwards them correctly.
  const targetUrl = `${backendUrl}/api/${path}${search}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API Proxy] ${request.method} /api/${path} -> ${targetUrl}`);
  }

  const hasBody = METHODS_WITH_BODY.has(request.method);
  let body: RequestInit['body'] = undefined;
  let duplex: 'half' | undefined = undefined;

  if (hasBody && request.body) {
    body = request.body;
    duplex = 'half';
  }

  try {
    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers: upstreamHeaders(request),
      body,
    };
    if (duplex) {
      fetchOptions.duplex = duplex;
    }

    const response = await fetchWithTimeout(targetUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Proxy] Backend (${response.status}) for ${path}:`, errorText.substring(0, 200));

      return handleErrorResponse(response, errorText);
    }

    const responseHeaders = copyResponseHeaders(response, 'no-store');

    // Pass the ReadableStream directly to support streaming and avoid in-memory buffering.
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const errObj = error as Record<string, unknown> | null;
    const errName = (errObj && typeof errObj.name === 'string') ? errObj.name : '';
    const errMsg = (errObj && typeof errObj.message === 'string') ? errObj.message : String(error);
    const isTimeout = errName === 'AbortError' || errMsg.toLowerCase().includes('aborted');
    console.error(
      `[API Proxy] ${isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR'} for ${request.method} /api/${path} ` +
      `target=${targetUrl} error=${errMsg}`
    );
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Backend request timed out'
          : 'Failed to connect to backend service',
        details: errMsg,
        target: targetUrl,
        attempts: 1,
        timeoutMs: FETCH_TIMEOUT_MS,
        hint: isTimeout
          ? 'The Vercel Function may be hitting its maxDuration limit (10s on Hobby, 30s on Pro). ' +
            'Also possible: cold start on the Go backend or Vercel-to-Vercel egress flakiness.'
          : 'Check that INTERNAL_API_URL points to a reachable backend and that the deployment is not protected.',
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
