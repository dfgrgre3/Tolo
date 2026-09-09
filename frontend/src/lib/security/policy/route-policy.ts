import { matchesPath } from '@/lib/auth/route-guards';

export const PROTECTED_PAGE_ROUTES = ['/dashboard', '/learning', '/profile', '/admin'] as const;
export const GUEST_PAGE_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/admin-login', '/mfa'] as const;
export const PUBLIC_API_ROUTES = ['/api/categories', '/api/teachers', '/api/homepage', '/api/blog', '/api/courses', '/api/navigation/menu'] as const;

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isGuestPage(pathname: string): boolean {
  return GUEST_PAGE_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_ROUTES.includes(pathname as (typeof PUBLIC_API_ROUTES)[number]);
}
