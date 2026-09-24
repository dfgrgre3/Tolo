import { NextRequest, NextResponse } from 'next/server';
import { POST as webVitalsPost } from '../analytics/web-vitals/route';
import { POST as revalidatePost } from '../cache/revalidate/route';
import { getBackendApiUrl, getBackendUrl } from '@/lib/api/backend-url';
import { forwardSetCookies } from '@/lib/security/cookie-attrs';
import { decodeStorageSegments, isPublicStorageBucket, FORWARDED_COOKIE_NAMES } from '@/lib/security/policy/storage-policy';
import { getUpstreamAuthorization, resolveTrustedClientIp } from '@/lib/security/policy/auth-policy';
import { isSameOriginRequest } from '@/lib/security/origin-check';
import { logger } from '@/lib/logging/unified-logger';
import { clearAuthCookies } from '@/proxy-pipeline/cookies';

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

// Hard timeout defaults: fail fast to avoid blocking serverless threads.
// The default 25s stays below the client-side API_TIMEOUT (30s) so errors
// propagate cleanly to the browser. Known-slow endpoints (first-request
// catalog/analytics compilation, backend pool warm-up, exports) get a
// longer 45s budget — still inside the 60s maxDuration above.
const FETCH_TIMEOUT_MS = 25_000;
const FETCH_TIMEOUT_LONG_MS = 45_000;

// Prefixes (without the leading /api/) that legitimately need the long
// budget. Keep this list short and evidence-backed: every entry here holds
// a serverless thread ~2x longer, so add only measured-slow routes.
const LONG_TIMEOUT_PREFIXES = [
  'analytics/',
  'reports/',
  'billing/export',
  'admin/export',
] as const;

function timeoutForPath(path: string): number {
  const normalized = path.replace(/^\/+/, '');
  if (
    LONG_TIMEOUT_PREFIXES.some(
      (prefix) => normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix),
    )
  ) {
    return FETCH_TIMEOUT_LONG_MS;
  }
  return FETCH_TIMEOUT_MS;
}

// Maximum allowed request body size forwarded through the proxy.
// Requests advertising a larger Content-Length are rejected immediately (413)
// before any upstream connection is made, preventing memory exhaustion and
// keeping serverless billing low.
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Raised inside the request-body stream when more than MAX_BODY_BYTES flow
 * through it. Distinguishes "client sent too much" from genuine upstream
 * network failures so the catch block can answer 413 instead of 502.
 */
class BodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Wraps an incoming request body so the size cap is enforced on ACTUAL
 * bytes, not on the Content-Length header. Headers lie (or are absent with
 * chunked encoding); the stream does not. Excess bytes error the stream,
 * which tears down both the client upload and the upstream connection —
 * the proxy never buffers the body, so memory stays flat.
 */
function limitRequestBodySize(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  onExceeded: () => void,
): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) {
          onExceeded();
          controller.error(new BodyTooLargeError(maxBytes));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

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

  // Forward the caller's idempotency key verbatim (progress heartbeats,
  // completion commands, question attempts). The proxy must never mint or
  // rotate it: the key is the dedupe identity, and any rewrite would turn
  // a safe retry into a double-counted write on the Go backend. Validated
  // as opaque ASCII (UUID / session:sequence); rejected values are dropped
  // rather than forwarded.
  const idem = request.headers.get('idempotency-key');
  if (idem && /^[\x20-\x7E]{1,128}$/.test(idem)) headers['Idempotency-Key'] = idem;

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
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
  let errorData: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(errorText);
    if (typeof parsed === 'string') {
      // Backend may return a bare JSON string body (e.g. `"Job not found or expired"`).
      // Normalize it to the standard envelope so the client can read `.error`.
      errorData = { error: parsed || `Backend error (HTTP ${response.status})` };
    } else if (parsed && typeof parsed === 'object') {
      errorData = parsed as Record<string, unknown>;
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
    } else {
      errorData = { error: `Backend error (HTTP ${response.status})` };
    }
  } catch {
    errorData = {
      error: response.status === 404 ? 'Resource not found on backend' : 'Backend error',
      status: response.status,
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

  // Defense in depth for every state-changing request that reaches the
  // transport proxy. The backend still validates CSRF and authorization;
  // this rejects cross-origin browser requests before they are forwarded.
  if (METHODS_WITH_BODY.has(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

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
      logger.warn(
        '[API Proxy] Refused storage bypass — only public buckets may be redirected.',
        { bucket: bucket || '(none)', path: `/api/${path}` },
      );
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    let supabaseOrigin: string;
    try {
      const parsed = new URL(configuredSupabaseUrl ?? '');
      if (
        parsed.protocol !== 'https:' &&
        !(process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')
      ) {
        throw new Error('non-https Supabase URL');
      }
      supabaseOrigin = parsed.origin;
    } catch {
      logger.error('[API Proxy] Storage redirect requested with invalid NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { error: 'Storage service unavailable' },
        { status: 503 },
      );
    }
    const objectPath = remaining.slice(1).map(encodeURIComponent).join('/');
    const encodedBucket = encodeURIComponent(bucket);
    // Canonical Supabase public-object URL — the same form the SDK's
    // `getPublicUrl()` emits and `resources-client` validates. (The old code
    // built `/storage/<bucket>/...`, which Supabase does not serve.)
    const objectBase = objectPath
      ? `${supabaseOrigin}/storage/v1/object/public/${encodedBucket}/${objectPath}`
      : `${supabaseOrigin}/storage/v1/object/public/${encodedBucket}`;
    // Query allowlist: Supabase image-transform params only, strictly
    // validated (see ImageTransformOptions in lib/storage/types.ts). The old
    // code forwarded `search` verbatim, letting callers smuggle `token`
    // (signed-URL confusion), `download` filenames, or junk that Supabase
    // honors and we get billed for. Everything else is dropped.
    const incoming = new URL(request.url).searchParams;
    const forwarded = new URLSearchParams();
    const intParam = (name: string, min: number, max: number) => {
      const raw = incoming.get(name);
      if (raw === null) return;
      if (!/^\d{1,4}$/.test(raw)) return;
      const n = Number(raw);
      if (n >= min && n <= max) forwarded.set(name, String(n));
    };
    intParam('width', 1, 2000);
    intParam('height', 1, 2000);
    intParam('quality', 1, 100);
    const format = incoming.get('format');
    if (format === 'origin' || format === 'webp' || format === 'avif') {
      forwarded.set('format', format);
    }
    const resize = incoming.get('resize');
    if (resize === 'cover' || resize === 'contain' || resize === 'fill') {
      forwarded.set('resize', resize);
    }
    const query = forwarded.size > 0 ? `?${forwarded.toString()}` : '';
    const redirectUrl = `${objectBase}${query}`;
    // Never log the query string: dropped params may carry tokens.
    logger.debug('[API Proxy] Media redirect (public bucket)', { path: `/api/${path}`, target: objectBase });
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
  try {
    getProxyBackendUrl();
  } catch (err) {
    // getBackendUrl() throws in production when neither INTERNAL_API_URL
    // nor NEXT_PUBLIC_API_URL is configured. Surface that as a structured
    // 503 with a remediation hint rather than letting fetch fail opaquely.
    logger.error(
      `[API Proxy] Refusing ${request.method} /api/${path} - no backend URL configured.`,
      err,
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
    logger.debug('[API Proxy] Forwarding request', { method: request.method, path: `/api/${path}`, target: targetUrl });
  }

  const hasBody = METHODS_WITH_BODY.has(request.method);
  let body: RequestInit['body'] = undefined;
  let duplex: 'half' | undefined = undefined;
  // Set when the streaming limiter trips: the upstream fetch then fails with
  // BodyTooLargeError and the catch block below must answer 413 (not 502).
  let requestBodyTooLarge = false;

  if (hasBody && request.body) {
    // Guard: reject oversized requests before opening an upstream connection.
    //
    // Three layers (the old code had only the first):
    //   1. CL+TE ambiguity → 400. A request carrying BOTH Content-Length and
    //      Transfer-Encoding is a classic request-smuggling shape; refuse it
    //      instead of guessing which framing the backend will honor.
    //   2. Declared Content-Length → validated strictly (non-numeric or
    //      negative values are rejected, not ignored) and capped at 413.
    //   3. Actual streamed bytes → capped by limitRequestBodySize(). This is
    //      the real guard: it covers chunked uploads with no declared length
    //      AND lying Content-Length headers, without buffering.
    const transferEncoding = request.headers.get('transfer-encoding');
    const contentLength = request.headers.get('content-length');
    if (transferEncoding && contentLength) {
      logger.warn(
        `[API Proxy] Rejected ${request.method} /api/${path} - ambiguous framing (Content-Length + Transfer-Encoding present)`,
        { method: request.method, path: `/api/${path}` },
      );
      return NextResponse.json(
        { error: 'Ambiguous request framing' },
        { status: 400 }
      );
    }
    if (contentLength) {
      const trimmed = contentLength.trim();
      const bodyBytes = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
      if (!Number.isSafeInteger(bodyBytes) || bodyBytes < 0) {
        logger.warn(
          `[API Proxy] Rejected ${request.method} /api/${path} - malformed Content-Length`,
          { method: request.method, path: `/api/${path}`, contentLength },
        );
        return NextResponse.json(
          { error: 'Invalid Content-Length' },
          { status: 400 }
        );
      }
      if (bodyBytes > MAX_BODY_BYTES) {
        logger.warn(
          `[API Proxy] Rejected ${request.method} /api/${path} - Content-Length exceeds limit`,
          { method: request.method, path: `/api/${path}`, bodyBytes, maxBytes: MAX_BODY_BYTES },
        );
        return NextResponse.json(
          { error: 'Request entity too large', maxBytes: MAX_BODY_BYTES },
          { status: 413 }
        );
      }
    }
    body = limitRequestBodySize(
      request.body as ReadableStream<Uint8Array>,
      MAX_BODY_BYTES,
      () => {
        requestBodyTooLarge = true;
      },
    );
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

    const response = await fetchWithTimeout(targetUrl, fetchOptions, timeoutForPath(path));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[API Proxy] Backend (${response.status}) error`, undefined, {
        path: `/api/${path}`,
        status: response.status,
        excerpt: errorText.substring(0, 200),
      });

      const errorResponse = handleErrorResponse(response, errorText);

      // A 401 from the session-probe endpoint while the request presented an
      // access token is the backend — the session authority — saying "this
      // token is not a session" (revoked, signed by a rotated key, or
      // otherwise rejected). Expire the stale auth cookies so the browser
      // stops sending them; otherwise the root layout keeps reporting
      // hasSessionHint and /auth/me re-401s on every page load.
      //
      // Scoped to /auth/me deliberately: other 401s (login, reauthenticate,
      // MFA) happen inside credential flows where a *valid* session may
      // exist alongside the failed attempt and must not be wiped.
      if (
        response.status === 401 &&
        path === 'v1/auth/me' &&
        request.cookies.has('access_token')
      ) {
        clearAuthCookies(errorResponse, request);
      }

      return errorResponse;
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
    // The streaming body limiter tripped: answer 413 so the client learns
    // the request was too large (a 502 here would trigger blind retries of
    // an upload that will never be accepted).
    if (
      requestBodyTooLarge ||
      error instanceof BodyTooLargeError ||
      (error instanceof Error && error.cause instanceof BodyTooLargeError)
    ) {
      logger.warn(
        `[API Proxy] Rejected ${request.method} /api/${path} - streamed body exceeds limit`,
        { method: request.method, path: `/api/${path}`, maxBytes: MAX_BODY_BYTES },
      );
      return NextResponse.json(
        { error: 'Request entity too large', maxBytes: MAX_BODY_BYTES },
        { status: 413 }
      );
    }
    const errObj = error as Record<string, unknown> | null;
    const errName = (errObj && typeof errObj.name === 'string') ? errObj.name : '';
    const errMsg = (errObj && typeof errObj.message === 'string') ? errObj.message : String(error);
    const isTimeout = errName === 'AbortError' || errMsg.toLowerCase().includes('aborted');
    logger.error(
      `[API Proxy] ${isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR'} for ${request.method} /api/${path}`,
      undefined,
      { method: request.method, path: `/api/${path}`, target: targetUrl, error: errMsg },
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
          timeoutMs: timeoutForPath(path),
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
