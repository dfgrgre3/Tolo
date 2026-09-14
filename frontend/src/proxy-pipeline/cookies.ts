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
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
}
