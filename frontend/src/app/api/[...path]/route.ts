import { NextRequest, NextResponse } from 'next/server';
import { POST as webVitalsPost } from '../analytics/web-vitals/route';
import { POST as revalidatePost } from '../cache/revalidate/route';
import { getBackendApiUrl, getBackendUrl } from '@/lib/api/backend-url';
import { forwardSetCookies } from '@/lib/security/cookie-attrs';
import { decodeStorageSegments, isPublicStorageBucket, FORWARDED_COOKIE_NAMES } from '@/lib/security/policy/storage-policy';
import { getUpstreamAuthorization, resolveTrustedClientIp } from '@/lib/security/policy/auth-policy';

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
// Enterprise. Bumping to 60s gives us enough headroom for:
//   cold start (1-3s) + Go backend (1-5s)
//   + the extra round-trip to vercel.app (1-3s when same region).
// 60s is well within the Pro plan limit and prevents the Vercel-level
// timeout from firing before our own FETCH_TIMEOUT_MS (25s) on slow routes
// such as /api/analytics/mega-menu where the first request after a cold
// start can take 20-30s to compile the route + warm the Go backend pool.
export const maxDuration = 60;

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Hard timeout for requests before failing fast to avoid blocking serverless threads.
// Set to 25s so it remains below the client-side API_TIMEOUT (30s) and allows
// proper error propagation back to the browser. The previous 12s value was too
// aggressive for cold-start routes where the Go backend needed 15-20s to warm
// up its DB pool on the very first request after a serverless cold start.
const FETCH_TIMEOUT_MS = 25_000;

// Maximum allowed request body size forwarded through the proxy.
// Requests advertising a larger Content-Length are rejected immediately (413)
// before any upstream connection is made, preventing memory exhaustion and
// keeping serverless billing low.
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

// =============================================================================
// Backend URL resolution
// =============================================================================
//
// Routed through the shared `getBackendUrl()` helper (see
// src/lib/api/backend-url.ts) so this proxy agrees with the api-client,
// jwt-edge, /api/auth/csrf, and /api/cache/revalidate about what "the
// backend URL" is. In production a missing config throws here too — we
// catch it and return a structured 503 with a clear remediation hint
// instead of letting fetch produce a confusing 502.
// =============================================================================

function getProxyBackendUrl(): string {
  return getBackendUrl();
}

// =============================================================================
// Header helpers
// =============================================================================

/**
 * Number of trusted reverse proxies in front of this proxy.
 * See `resolveClientIp` for the policy.
 */
/**
 * Derive the real client IP without trusting attacker-controlled
 * X-Forwarded-For values.
 *
 * X-Forwarded-For is a comma-separated chain: `client, proxy1, proxy2`.
 * The leftmost value is what the original client (or an attacker)
 * controls — blindly forwarding it lets an attacker spoof their IP for
 * rate-limiting, audit logs, and abuse detection.
 *
 * Policy:
 *   - If TRUSTED_PROXY_COUNT > 0, pick the hop just BEFORE the trusted
 *     suffix of the XFF chain.
 *   - Otherwise drop XFF entirely (empty string → backend logs "unknown"
 *     instead of a spoofed value).
 */
function resolveClientIp(request: NextRequest): string {
  return resolveTrustedClientIp(request);
}

function upstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  // Only accept the Authorization header. Tokens in URL query parameters are
  // a leakage risk: they end up in proxy logs, browser history, server access
  // logs and analytics tools. They are intentionally NOT supported here.
  const auth = getUpstreamAuthorization(request);

  if (auth) headers['Authorization'] = auth;

  const cookie = request.headers.get('cookie');
  if (cookie) {
    // Forward an allowlist of cookies rather than the raw Cookie header.
    // The frontend may carry analytics, experiments, framework, and legacy
    // cookies that the backend has no business seeing — and every extra
    // cookie is one more byte of PII or internal state leaking upstream.
    // Only forward the cookies the backend actually consumes.
    const ALLOWED_COOKIES = FORWARDED_COOKIE_NAMES;
    const forwarded = cookie
      .split(/;\s*/)
      .filter((kv) => kv.includes('='))
      .map((kv) => {
        const eqIdx = kv.indexOf('=');
        const name = kv.substring(0, eqIdx).trim();
        return { name, value: kv.substring(eqIdx + 1) };
      })
      .filter(({ name }) => ALLOWED_COOKIES.has(name))
      .map(({ name, value }) => `${name}=${value}`)
      .join('; ');
    if (forwarded) headers['Cookie'] = forwarded;
  }

  // Resolve client IP from trusted-proxy chain rather than trusting the
  // raw X-Forwarded-For header. See resolveClientIp() below for the
  // spoof-resistance policy (TRUSTED_PROXY_COUNT).
  const ip = resolveClientIp(request);
  if (ip) headers['x-forwarded-for'] = ip;

  // Forward CSRF token
  const csrf = request.headers.get('x-csrf-token');
  if (csrf) headers['X-CSRF-Token'] = csrf;

  // Forward content type
  const ct = request.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  // Forward User-Agent
  const ua = request.headers.get('user-agent');
  if (ua) headers['User-Agent'] = ua;

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

  if (!responseHeaders.has('content-type')) {
    responseHeaders.set('content-type', response.headers.get('content-type') || 'application/json');
  }

  if (defaultCacheControl && !responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', response.headers.get('cache-control') || defaultCacheControl);
  }

  return responseHeaders;
}

function applyCookies(fromResponse: Response, toResponse: NextResponse) {
  // Forward Set-Cookie headers verbatim from the backend. The previous
  // implementation parsed each attribute and rebuilt the cookie via
  // Next.js `cookies.set(name, value, options)`, which silently dropped
  // any attribute the backend set that we did not recognize
  // (Partitioned, Priority, SameParty, custom prefixes, etc.) and was a
  // fragile place to keep auth-cookie security in sync.
  //
  // `forwardSetCookies` centralizes:
  //   - dev-only `Secure` stripping (so http://localhost still works),
  //   - validation of HttpOnly/Secure/SameSite on auth cookies,
  //   - Sentry reporting for any violation.
  //
  // The frontend is a pass-through; the Go backend is the source of
  // truth for cookie attributes.
  forwardSetCookies({
    from: fromResponse,
    to: toResponse,
    reportViolation: (name, violations) => {
      const { addBreadcrumb } = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
      addBreadcrumb({
        category: 'auth.cookie',
        level: 'warning',
        data: {
          cookie: name,
          violations,
          route: '/api/[...path]',
        },
      });
    },
  });
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

  const nextResponse = NextResponse.json(errorData, {
    status: response.status,
    headers: responseHeaders
  });

  applyCookies(response, nextResponse);

  return nextResponse;
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

  // This route is transport-only. It forwards the caller's auth context to
  // the backend but never makes an authorization decision. Privileged
  // operations must be rejected by the backend using JWT/session identity,
  // server-side permissions, and resource ownership checks.

  // SECURITY: /api/storage/* is a redirect-only fast path to the Supabase
  // Storage CDN. A redirect is only safe when the target object is genuinely
  // world-readable — for anything private (student work, certificates,
  // invoices, teacher files) a 307 to Supabase would leak the object past
  // every authorization layer on this proxy.
  //
  // Policy:
  //   - Only redirect when the FIRST segment after "storage" names an
  //     explicitly-public bucket. Unknown buckets => 404 (do NOT redirect).
  //   - All other storage paths must be served via /api/storage/<bucket>/<...>
  //     route handlers that create a short-lived signed URL after verifying
  //     the caller's identity and ownership.
  //   - Reject path traversal (no "..", no encoded slashes that escape the
  //     bucket segment, no leading slashes).
  if (params.path[0] === 'storage') {
    const remaining = decodeStorageSegments(params.path.slice(1));
    if (!remaining) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }
    const bucket = remaining[0];
    if (!isPublicStorageBucket(bucket)) {
      console.warn(
        `[API Proxy] Refused storage bypass for bucket=${bucket || '(none)'} path=/api/${path}. ` +
        `Only public buckets may be redirected; private content must be served via a signed URL route.`
      );
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!configuredSupabaseUrl) {
      console.error('[API Proxy] Storage redirect requested without NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { error: 'Storage service unavailable' },
        { status: 503 },
      );
    }
    const supabaseUrl = configuredSupabaseUrl.replace(/\/+$/, '');
    const { search } = new URL(request.url);
    const objectPath = remaining.slice(1).map(encodeURIComponent).join('/');
    const encodedBucket = encodeURIComponent(bucket);
    const redirectUrl = objectPath
      ? `${supabaseUrl}/storage/${encodedBucket}/${objectPath}${search}`
      : `${supabaseUrl}/storage/${encodedBucket}${search}`;
    console.log(`[API Proxy] Media redirect (public bucket): /api/${path} -> ${redirectUrl}`);
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
  let backendUrl: string;
  try {
    backendUrl = getProxyBackendUrl();
  } catch (err) {
    // getBackendUrl() throws in production when neither INTERNAL_API_URL
    // nor NEXT_PUBLIC_API_URL is configured. Surface that as a structured
    // 503 with a remediation hint rather than letting fetch fail opaquely.
    console.error(
      `[API Proxy] Refusing ${request.method} /api/${path} - no backend URL configured.`,
      err
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
  // Backend routes are versioned at /api/v1 (internal/infrastructure/api/*_routes.go).
  const targetUrl = `${getBackendApiUrl(`/${path}`)}${search}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API Proxy] ${request.method} /api/${path} -> ${targetUrl}`);
  }

  const hasBody = METHODS_WITH_BODY.has(request.method);
  let body: RequestInit['body'] = undefined;
  let duplex: 'half' | undefined = undefined;

  if (hasBody && request.body) {
    // Guard: reject oversized requests before opening an upstream connection.
    // We check the Content-Length header only — chunked-encoded requests without
    // a declared length are allowed through (the backend enforces its own limit).
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const bodyBytes = parseInt(contentLength, 10);
      if (!isNaN(bodyBytes) && bodyBytes > MAX_BODY_BYTES) {
        console.warn(
          `[API Proxy] Rejected ${request.method} /api/${path} - ` +
          `Content-Length ${bodyBytes} exceeds MAX_BODY_BYTES ${MAX_BODY_BYTES}`
        );
        return NextResponse.json(
          { error: 'Request entity too large', maxBytes: MAX_BODY_BYTES },
          { status: 413 }
        );
      }
    }
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
    const nextResponse = new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

    applyCookies(response, nextResponse);

    return nextResponse;
  } catch (error: unknown) {
    const errObj = error as Record<string, unknown> | null;
    const errName = (errObj && typeof errObj.name === 'string') ? errObj.name : '';
    const errMsg = (errObj && typeof errObj.message === 'string') ? errObj.message : String(error);
    const isTimeout = errName === 'AbortError' || errMsg.toLowerCase().includes('aborted');
    console.error(
      `[API Proxy] ${isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR'} for ${request.method} /api/${path} ` +
      `target=${targetUrl} error=${errMsg}`
    );

    // SECURITY: In production we must NOT expose the internal backend URL
    // (targetUrl) or raw error messages to the browser — they reveal the
    // internal network topology. Debug details are still logged above.
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Backend request timed out'
          : 'Failed to connect to backend service',
        ...(isDev ? {
          details: errMsg,
          target: targetUrl,
          attempts: 1,
          timeoutMs: FETCH_TIMEOUT_MS,
          hint: isTimeout
            ? 'The Vercel Function may be hitting its maxDuration limit (10s on Hobby, 30s on Pro). ' +
              'Also possible: cold start on the Go backend or Vercel-to-Vercel egress flakiness.'
            : 'Check that INTERNAL_API_URL points to a reachable backend and that the deployment is not protected.',
        } : {}),
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
