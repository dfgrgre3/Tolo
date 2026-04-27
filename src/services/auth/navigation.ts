/**
 * Authentication Navigation Utilities
 */

export const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';
export const DEFAULT_UNAUTHENTICATED_ROUTE = '/login';
export const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Sanitizes a redirect path to ensure it's a relative path and not a malicious external URL.
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback: string = DEFAULT_AUTHENTICATED_ROUTE): string {
  if (!path) return fallback;

  // Ensure the path is relative (starts with / but not //)
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path;
  }

  // If it's an absolute URL, check if it's the same origin (optional, but safer to just fallback)
  return fallback;
}

/**
 * Checks if a route is public.
 */
export function isAuthPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}
