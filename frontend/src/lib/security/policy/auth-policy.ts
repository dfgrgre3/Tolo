import type { NextRequest } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const AUTHORIZATION_HEADER = 'authorization';
export const LEGACY_TOKEN_COOKIE_NAMES = ['auth_token', 'bearer_token'] as const;

export const TRUSTED_PROXY_COUNT = Number(process.env.TRUSTED_PROXY_COUNT || 0);

export function isLegacyJwtSecretAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.JWT_MIGRATION_MODE === 'true';
}

export function resolveTrustedClientIp(request: NextRequest): string {
  if (TRUSTED_PROXY_COUNT <= 0) return '';
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return '';
  const hops = xff.split(',').map((hop) => hop.trim()).filter(Boolean);
  const clientIndex = Math.max(0, hops.length - TRUSTED_PROXY_COUNT) - 1;
  return clientIndex >= 0 ? hops[clientIndex] || '' : '';
}

export function getUpstreamAuthorization(request: NextRequest): string | null {
  // Canonical auth source: Authorization header only.
  // The frontend should use HttpOnly access_token cookie for authentication,
  // which is then forwarded as Authorization header by the proxy.
  // Legacy cookie-based auth (auth_token, bearer_token) is not supported.
  return request.headers.get(AUTHORIZATION_HEADER);
}
