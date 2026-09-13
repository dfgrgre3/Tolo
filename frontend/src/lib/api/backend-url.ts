/**
 * Canonical backend URL resolver.
 *
 * Single source of truth for "where is the backend?" — every server-side
 * caller (api-client, jwt-edge, /api/auth/csrf, /api/cache/revalidate,
 * the catch-all /api/[...path] proxy) MUST go through this helper.
 *
 * This module re-exports from @thanawy/shared/backend-url to ensure
 * the entire codebase uses the same URL resolution policy.
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

export {
  getBackendUrl,
  getBackendApiUrl,
  __resetBackendUrlCache,
} from "@thanawy/shared/backend-url";