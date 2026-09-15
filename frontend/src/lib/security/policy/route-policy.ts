import { matchesPath, PUBLIC_API_ENDPOINTS } from '@/lib/auth/route-guards';

export const PROTECTED_PAGE_ROUTES = ['/dashboard', '/learning', '/profile', '/admin'] as const;
export const GUEST_PAGE_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/mfa'] as const;
/** Re-exported for compatibility; canonical list lives in route-guards.ts. */
export const PUBLIC_API_ROUTES = PUBLIC_API_ENDPOINTS;

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isGuestPage(pathname: string): boolean {
  return GUEST_PAGE_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_ROUTES.includes(pathname);
}
