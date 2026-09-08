/**
 * Backend URL resolver for the contracts package.
 *
 * This module re-exports from @thanawy/shared/backend-url to ensure
 * consistency with the frontend and other consumers.
 *
 * Resolution order (mirrors frontend/src/lib/api/backend-url.ts):
 *   1. INTERNAL_API_URL          — server-side, container-to-container
 *   2. NEXT_PUBLIC_API_URL       — browser, may be relative in same-origin
 *   3. fallback                  — local dev default (http://127.0.0.1:8082)
 *
 * IMPORTANT: In production (NODE_ENV=production OR VERCEL=1), missing
 * env vars throw an error — no silent fallback to localhost.
 */

export {
  getBackendUrl,
  getBackendApiUrl,
  __resetBackendUrlCache,
} from "../../../shared/src/backend-url";

import { getBackendUrl, getBackendApiUrl } from "../../../shared/src/backend-url";

/**
 * @deprecated Use getBackendUrl() from @thanawy/shared/backend-url instead.
 * This alias is provided for backwards compatibility during migration.
 */
export const getContractsBaseUrl = getBackendUrl;

/**
 * @deprecated Use getBackendApiUrl() from @thanawy/shared/backend-url instead.
 * This alias is provided for backwards compatibility during migration.
 */
export const getContractsApiUrl = getBackendApiUrl;
