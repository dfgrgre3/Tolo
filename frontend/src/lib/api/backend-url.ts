/**
 * Canonical backend URL resolver.
 *
 * Single source of truth for "where is the backend?" — every server-side
 * caller (api-client, jwt-edge, /api/auth/csrf, /api/cache/revalidate,
 * the catch-all /api/[...path] proxy) MUST go through this helper.
 *
 * Policy
 * ------
 *  - In production (NODE_ENV=production OR VERCEL=1): missing env vars throw
 *    a clear Error at startup. The previous per-file fallback chain let
 *    Route A return 502, Route B return localhost, and Route C return
 *    NEXT_PUBLIC_API_URL inside the same deployment — depending on which
 *    module happened to be evaluated first. Funneling every caller through
 *    one helper eliminates that drift.
 *  - In development: an explicit dev fallback (`http://127.0.0.1:8082`) is
 *    used so local DX works without a `.env.local`. The fallback is NEVER
 *    used in production.
 *
 * `getBackendUrl()` returns only the origin. Use `getBackendApiUrl()` for
 * backend API paths so `/api/v1` is composed in exactly one place.
 */

const DEV_FALLBACK = 'http://127.0.0.1:8082';

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

let cached: string | null = null;

/**
 * Resolve the backend base URL.
 *
 * Throws in production when neither INTERNAL_API_URL nor NEXT_PUBLIC_API_URL
 * is configured. Returns the dev fallback otherwise.
 *
 * The throw is intentional: a missing backend URL is a deploy-time mistake,
 * not something a user request should silently 502 on. Catching and falling
 * back to localhost was the root cause of route-dependent behavior.
 */
export function getBackendUrl(): string {
  if (cached !== null) return cached;

  const raw = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (raw && raw.trim()) {
    cached = raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return cached;
  }

  if (isProductionEnv()) {
    throw new Error(
      '[backend-url] FATAL: No backend URL configured in production. ' +
        'Set INTERNAL_API_URL (preferred, server-to-server) or NEXT_PUBLIC_API_URL ' +
        'in the deployment environment. Refusing to fall back to localhost.'
    );
  }

  // Development only — explicit dev fallback so `next dev` works out of the box.
  cached = DEV_FALLBACK;
  return cached;
}

/**
 * Test-only: drop the cached value so a process can be re-resolved.
 * Not exported in production builds is unnecessary; keep it side-effect-free.
 */
export function __resetBackendUrlCache(): void {
  cached = null;
}

/**
 * Build a canonical URL for a backend API route.
 *
 * Accepts `/courses`, `/api/courses`, or `/api/v1/courses` and always returns
 * exactly one `/api/v1` prefix. Query strings and fragments are preserved.
 */
export function getBackendApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath
    .replace(/^\/api\/v1(?=\/|\?|#|$)/, '')
    .replace(/^\/api(?=\/|\?|#|$)/, '');
  return `${getBackendUrl()}/api/v1${apiPath || '/'}`;
}