/**
 * Single source of truth for resolving the backend base URL.
 *
 * Kept in this package (rather than `frontend/src/lib/api/backend-url.ts`)
 * so generated clients in other contexts (mobile, scripts, tests) can
 * reuse the same resolution rules without dragging in the Next.js config.
 *
 * Resolution order (mirrors frontend/src/lib/api/backend-url.ts):
 *   1. INTERNAL_API_URL          — server-side, container-to-container
 *   2. NEXT_PUBLIC_API_URL       — browser, may be relative in same-origin
 *   3. fallback                  — local dev default
 *
 * IMPORTANT: For consistency with the frontend's getBackendApiUrl(),
 * this normalizes URLs by stripping /api/ and trailing slashes.
 */
export function getContractsBaseUrl(): string {
  const internal = process.env.INTERNAL_API_URL;
  if (internal) return normalizeBackendUrl(internal);
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub) return normalizeBackendUrl(pub);
  return "http://127.0.0.1:8082";
}

/**
 * Normalize backend URL by stripping /api/ suffix and trailing slashes.
 * This matches the normalization logic in frontend/src/lib/api/backend-url.ts
 * to ensure consistent URL building across the entire codebase.
 */
function normalizeBackendUrl(url: string): string {
  return url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

/**
 * Build a canonical URL for a backend API route.
 *
 * This function mirrors the logic in frontend/src/lib/api/backend-url.ts
 * to ensure consistent URL composition across the entire codebase.
 *
 * Accepts `/courses`, `/api/courses`, or `/api/v1/courses` and always returns
 * exactly one `/api/v1` prefix. Query strings and fragments are preserved.
 *
 * @param path - The API path (with or without /api or /api/v1 prefix)
 * @returns The complete backend API URL with /api/v1 prefix
 */
export function getContractsApiUrl(path: string): string {
  const baseUrl = getContractsBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath
    .replace(/^\/api\/v1(?=\/|\?|#|$)/, '')
    .replace(/^\/api(?=\/|\?|#|$)/, '');
  return `${baseUrl}/api/v1${apiPath || '/'}`;
}
