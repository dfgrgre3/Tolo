/**
 * Authentication Navigation Utilities
 *
 * Centralizes the redirect/default-route logic used across the (auth) route group
 * so every page applies the same safe-redirect policy (prevents open-redirect).
 */

export const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";
export const DEFAULT_UNAUTHENTICATED_ROUTE = "/login";

/** Public routes used only by safe client-side redirect classification. */
export const SAFE_REDIRECT_PUBLIC_ROUTES = [
  "/",
  "/login",
  "/admin-login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const BACKSLASH_CHAR = String.fromCharCode(92);

/**
 * True when `path` contains an ASCII control character (0x00-0x1F or 0x7F)
 * or a backslash. Tabs/newlines can be stripped by a browser while resolving
 * a URL, turning "/\t/evil.com" into "//evil.com"; a backslash can be
 * normalized to "/" before parsing, turning "/\evil.com" into the
 * protocol-relative "//evil.com". Both are open-redirect vectors that a
 * plain `startsWith("//")` check does not catch.
 */
function hasUnsafeRedirectChars(path: string): boolean {
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || path.charAt(i) === BACKSLASH_CHAR) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes a redirect path to ensure it is a safe relative path and never an
 * external / protocol-relative URL (open-redirect protection).
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_ROUTE
): string {
  if (!path) return fallback;

  if (hasUnsafeRedirectChars(path)) {
    return fallback;
  }

  // Only allow relative paths starting with a single "/" (not "//" which
  // could be an external URL such as //evil.com).
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return fallback;
}

/**
 * Checks whether a path is a public (unauthenticated) route.
 */
export function isAuthPublicRoute(pathname: string): boolean {
  return SAFE_REDIRECT_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
