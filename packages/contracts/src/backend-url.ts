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
 */
export function getContractsBaseUrl(): string {
  const internal = process.env.INTERNAL_API_URL;
  if (internal) return stripTrailingSlash(internal);
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub) return stripTrailingSlash(pub);
  return "http://127.0.0.1:8082";
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
