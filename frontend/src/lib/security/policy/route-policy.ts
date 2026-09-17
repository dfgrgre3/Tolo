import {
  PUBLIC_API_ENDPOINTS,
  PROTECTED_ROUTES,
  PROTECTED_WRITE_PATHS,
  isPublicApiEndpoint,
  isProtectedRoute,
  isGuestRoute,
  stripQueryFragment,
} from '@/lib/auth/route-guards';

/**
 * Canonical protected-page list — re-exported from `route-guards.ts`
 * (single source of truth). `/admin` is appended by `isProtectedRoute`
 * in the canonical module; it is listed here explicitly so type-level
 * consumers iterating this array see the complete set.
 */
export const PROTECTED_PAGE_ROUTES: readonly string[] = [
  ...PROTECTED_ROUTES,
  ...PROTECTED_WRITE_PATHS,
  '/admin',
] as const;
export const GUEST_PAGE_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'] as const;
/** Re-exported for compatibility; canonical list lives in route-guards.ts. */
export const PUBLIC_API_ROUTES = PUBLIC_API_ENDPOINTS;

export function isProtectedPage(pathname: string): boolean {
  return isProtectedRoute(pathname);
}

export function isGuestPage(pathname: string): boolean {
  return isGuestRoute(pathname);
}

export function isPublicApiPath(pathname: string): boolean {
  return isPublicApiEndpoint(stripQueryFragment(pathname));
}
