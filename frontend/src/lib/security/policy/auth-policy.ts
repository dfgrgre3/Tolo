import type { NextRequest } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const AUTHORIZATION_HEADER = 'authorization';
export const LEGACY_TOKEN_COOKIE_NAMES = ['auth_token', 'bearer_token'] as const;

/**
 * Number of trusted reverse proxies in front of this edge runtime.
 *
 * IMPORTANT: This value MUST match your actual deployment topology:
 * - 0 (default): No trusted proxies - X-Forwarded-For is ignored completely
 * - 1: Single CDN/proxy (e.g., Vercel or Cloudflare only)
 * - 2: CDN + custom reverse proxy
 * - N: Match your actual proxy chain
 *
 * X-Forwarded-For is a comma-separated chain: `client, proxy1, proxy2`.
 * The leftmost value is controlled by the original client (or attacker),
 * so blindly trusting it allows IP spoofing and bypasses rate limiting,
 * auditing, and abuse detection.
 *
 * When TRUSTED_PROXY_COUNT > 0, we treat the RIGHTMOST N hops as trusted
 * (they were appended by proxies we control) and pick the value just
 * before that boundary as the real client IP.
 *
 * WARNING: Using the wrong value will break:
 * - Rate limiting
 * - Audit logging
 * - Abuse protection
 * - IP-based security rules
 *
 * DEPLOYMENT CHECKLIST:
 * - If using Vercel/Cloudflare: Set TRUSTED_PROXY_COUNT=1
 * - If using CDN + custom proxy: Set TRUSTED_PROXY_COUNT=2
 * - If direct to backend: Set TRUSTED_PROXY_COUNT=0 or leave unset
 * - Test IP resolution in staging before production deployment
 *
 * Set this in your environment (.env.production) to match your deployment.
 */
export const TRUSTED_PROXY_COUNT = Number(process.env.TRUSTED_PROXY_COUNT || 0);

/**
 * Validate TRUSTED_PROXY_COUNT configuration.
 * Logs a warning in production if using the default value, as this may
 * indicate misconfiguration for CDN/deployed environments.
 */
export function validateTrustedProxyCount(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.TRUSTED_PROXY_COUNT) {
    console.warn(
      '[auth-policy] TRUSTED_PROXY_COUNT not set in production. ' +
      'If using a CDN or reverse proxy, this will cause IP-based security ' +
      'features (rate limiting, audit logging, abuse protection) to fail. ' +
      'Set TRUSTED_PROXY_COUNT to match your deployment topology.'
    );
  }
}

/**
 * Unified policy for legacy JWT secret usage.
 * 
 * Legacy HS256 secret is allowed ONLY in development.
 * JWT_MIGRATION_MODE is NOT supported as a production bypass.
 * This aligns with jwt-edge.ts which explicitly rejects JWT_SECRET in production.
 */
export function canUseLegacyJwtSecret(): boolean {
  return process.env.NODE_ENV === 'development';
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
  // The browser's canonical auth source is the HttpOnly access_token cookie.
  // Accept an explicit header for server-to-server callers, but never legacy
  // auth_token/bearer_token cookies.
  const authorization = request.headers.get(AUTHORIZATION_HEADER);
  if (authorization) return authorization;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  return accessToken ? `Bearer ${accessToken}` : null;
}

// Run validation at module load time
validateTrustedProxyCount();
