import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
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
      logger.error('[proxy] Refusing insecure auth cookie from backend', undefined, { violations });
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

export function clearAuthCookies(response: NextResponse, request?: NextRequest): void {
  // The backend issues auth cookies with explicit attributes (typically
  // `Path=/`, possibly `Domain=...`, `Secure` in production). The old code
  // only expired a host-only, non-Secure copy — two ghosts survived:
  //   1. a `Domain=.example.com` copy (browsers treat Domain-scoped and
  //      host-only cookies as DISTINCT entries; expiring one leaves the
  //      other alive and the dead session "ghosts" back), and
  //   2. a `Secure` copy on HTTPS (some browsers ignore a non-Secure
  //      expiration for a Secure cookie).
  // So we expire every plausible variant: host-only + Domain-scoped
  // candidates derived from the request host, each with the production
  // `Secure` attribute mirrored. Legacy pre-rotation names are cleared too
  // so old-version cookies cannot resurrect a session.
  const domains = resolveClearCookieDomains(request);
  const secureSuffix =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  const names = [
    "access_token",
    "refresh_token",
    "auth_token",
    "bearer_token",
  ] as const;
  for (const name of names) {
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
    // Host-only expiration (no Domain attribute) — kills the copy the
    // backend set without Domain.
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureSuffix}`,
    );
    // Domain-scoped expirations — kill copies the backend set with
    // `Domain=.example.com` (or `Domain=<host>`). Browsers require the
    // Domain attribute to match for the expiration to apply.
    for (const domain of domains) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureSuffix}`,
      );
    }
  }
}

/**
 * Derives the Domain attribute candidates an expired Set-Cookie must cover.
 *
 * Returns `[]` for localhost/IP hosts (Domain cookies cannot be set there,
 * so the backend could only have issued host-only cookies). For a dotted
 * hostname it returns the full host plus its registrable-suffix guess
 * (`app.example.com` → `["app.example.com", ".example.com"]`), covering
 * both `Domain=<host>` and `Domain=.suffix` backend styles. Values are
 * validated to plain ASCII host labels so a spoofed Host header cannot
 * inject Set-Cookie attribute syntax.
 */
function resolveClearCookieDomains(request?: NextRequest): string[] {
  const rawHost =
    request?.headers.get("host") ?? request?.nextUrl.hostname ?? "";
  const host = rawHost.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host || host === "localhost") return [];
  // IPv4 / IPv6 / bracketed — Domain attribute is illegal, nothing to cover.
  if (/^[\d.]+$/.test(host) || host.includes(":")) return [];
  if (!/^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/.test(host)) return [];
  const labels = host.split(".");
  if (labels.length < 2) return [];
  const candidates = new Set<string>([host]);
  // Strip the leftmost label once (`app.example.com` → `.example.com`).
  // Deeper stripping (`co.uk` style) is intentionally avoided: over-broad
  // Domain expirations are ignored by browsers anyway when they cross the
  // public-suffix boundary, and the host-only + one-level variants already
  // cover every Domain style this backend deploys.
  candidates.add(`.${labels.slice(1).join(".")}`);
  return [...candidates];
}
