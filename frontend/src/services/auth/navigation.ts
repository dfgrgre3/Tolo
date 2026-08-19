/**
 * Authentication Navigation Utilities
 *
 * Centralizes the redirect/default-route logic used across the (auth) route group
 * so every page applies the same safe-redirect policy (prevents open-redirect).
 */

export const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";
export const DEFAULT_UNAUTHENTICATED_ROUTE = "/login";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/admin-login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * Sanitizes a redirect path to ensure it is a safe relative path and never an
 * external / protocol-relative URL (open-redirect protection).
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_ROUTE
): string {
  if (!path) return fallback;

  // Only allow relative paths starting with a single "/" (not "//" which could
  // be an external URL such as //evil.com).
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return fallback;
}

/**
 * Checks whether a path is a public (unauthenticated) route.
 */
export function isAuthPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}