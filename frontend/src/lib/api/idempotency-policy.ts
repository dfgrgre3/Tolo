const IDEMPOTENT_WRITE_PREFIXES = [
  "/api/payments/",
  "/api/orders/",
  "/api/subscriptions/",
  "/api/billing/wallet",
] as const;

const COURSE_CHECKOUT_PATH = /^\/api\/courses\/[^/]+\/checkout$/;
const COURSE_ENROLL_PATH = /^\/api\/courses\/[^/]+\/enroll$/;
const CART_CHECKOUT_PATH = /^\/api\/cart\/checkout$/;

const NON_IDEMPOTENT_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/verify-mfa",
  "/api/analytics/",
  "/api/telemetry/",
  "/api/ws",
  "/api/search/",
] as const;

function pathnameOnly(endpoint: string): string {
  try {
    return new URL(endpoint, "http://local.invalid").pathname;
  } catch {
    return endpoint.split(/[?#]/, 1)[0] || endpoint;
  }
}

/**
 * Only operations whose backend contract explicitly supports replay receive
 * an idempotency key. A write is not automatically idempotent just because it
 * uses POST, PUT, PATCH, or DELETE.
 *
 * Policy:
 *   - Explicitly idempotent endpoints (payments, orders) require keys
 *   - Auth operations (login, logout, register) are NOT idempotent
 *   - Analytics/telemetry endpoints are NOT idempotent
 *   - WebSocket initiation is NOT idempotent
 *   - Search-like POSTs are NOT idempotent
 *   - Upload operations are NOT idempotent
 */
export function requiresIdempotencyKey(method: string, endpoint: string): boolean {
  const normalizedMethod = method.toUpperCase();
  const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (!WRITE_METHODS.has(normalizedMethod)) {
    return false;
  }

  const path = pathnameOnly(endpoint);

  // Explicitly non-idempotent endpoints are excluded first
  if (NON_IDEMPOTENT_ENDPOINTS.some(
    (ep) => path === ep || path.startsWith(ep)
  )) {
    return false;
  }

  // Only explicitly whitelisted endpoints require idempotency keys
  return COURSE_CHECKOUT_PATH.test(path)
    || COURSE_ENROLL_PATH.test(path)
    || CART_CHECKOUT_PATH.test(path)
    || IDEMPOTENT_WRITE_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
  );
}
