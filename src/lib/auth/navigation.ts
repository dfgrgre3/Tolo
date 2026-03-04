export const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

export const AUTH_PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

const DISALLOWED_REDIRECT_PREFIXES = ['//', '/\\', '/api/'];

/**
 * Sanitize internal redirect paths to prevent open redirects.
 * Accepts only same-origin relative URLs.
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_ROUTE
): string {
  if (!value) {
    return fallback;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith('/')) {
    return fallback;
  }

  if (DISALLOWED_REDIRECT_PREFIXES.some(prefix => trimmedValue.startsWith(prefix))) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmedValue, 'http://localhost');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Build login URL with optional safe redirect target.
 * Prevents redirecting back to auth-public routes to avoid loops.
 */
export function buildLoginUrl(currentPath?: string | null): string {
  const redirectPath = sanitizeRedirectPath(currentPath, '/');

  try {
    const parsed = new URL(redirectPath, 'http://localhost');
    if (isAuthPublicRoute(parsed.pathname)) {
      return '/login';
    }
  } catch {
    return '/login';
  }

  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}

export function isAuthPublicRoute(pathname: string): boolean {
  return AUTH_PUBLIC_ROUTES.includes(pathname);
}
