import { NextResponse } from 'next/server';
import {
  forwardSetCookieForDev,
  validateAuthCookieAttributes,
} from '@/lib/security/cookie-attrs';

export function updateCookieHeader(
  headers: Headers,
  accessToken?: string,
  refreshToken?: string,
): void {
  if (!accessToken && !refreshToken) return;

  const parsed = new Map<string, string>();
  for (const cookie of (headers.get('cookie') || '').split(';')) {
    const separator = cookie.indexOf('=');
    if (separator <= 0) continue;
    const key = cookie.slice(0, separator).trim();
    const rawValue = cookie.slice(separator + 1).trim();
    // Cookie values may be percent-encoded by the browser/backend; decode so
    // the in-memory map holds the plain value consistently with what we set
    // below. Fall back to the raw value if it isn't valid percent-encoding.
    try {
      parsed.set(key, decodeURIComponent(rawValue));
    } catch {
      parsed.set(key, rawValue);
    }
  }

  if (accessToken) parsed.set('access_token', accessToken);
  if (refreshToken) parsed.set('refresh_token', refreshToken);
  headers.set(
    'cookie',
    Array.from(parsed.entries())
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('; '),
  );
}

export function appendRefreshCookies(response: NextResponse, cookies: string[]): void {
  for (const cookie of cookies) {
    const adjusted = forwardSetCookieForDev(cookie);
    const violations = validateAuthCookieAttributes(adjusted);
    if (violations.length > 0 && process.env.NODE_ENV === 'production') {
      console.error('[proxy] Refusing insecure auth cookie from backend', violations);
      continue;
    }
    response.headers.append('Set-Cookie', adjusted);
    if (violations.length > 0) {
      const { addBreadcrumb } = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
      addBreadcrumb({
        category: 'auth.cookie',
        level: 'warning',
        data: { violations, route: 'proxy' },
      });
    }
  }
}

export function clearAuthCookies(response: NextResponse): void {
  // The backend issues auth cookies with explicit attributes (typically
  // `Path=/`, possibly `Domain=...`). `cookies.delete(name)` without a path
  // only clears the cookie for the *current* path — the browser keeps the
  // backend's `Path=/` copy and the dead session "ghosts" back on the next
  // request. So: delete with the explicit root path AND append an expired
  // Set-Cookie fallback covering the same path. The fallback is what
  // actually guarantees removal even if the Next.js cookie-store form and
  // the backend's Domain attribute disagree.
  for (const name of ["access_token", "refresh_token"] as const) {
    try {
      // Options overload: clears the cookie scoped to the root path, which
      // is where the backend issues it.
      response.cookies.delete({ name, path: "/" });
    } catch {
      try {
        response.cookies.delete(name);
      } catch {
        // Cookie-store unavailable — the expired Set-Cookie below still clears.
      }
    }
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
    );
  }
}
