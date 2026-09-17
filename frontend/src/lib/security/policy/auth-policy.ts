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
/**
 * Parses TRUSTED_PROXY_COUNT into a non-negative integer, failing closed
 * (0 — "trust nothing") on anything malformed rather than propagating `NaN`
 * or a negative count into `resolveTrustedClientIp`'s arithmetic (SYM-007 in
 * the symbol architecture audit: this value is a security input, not just a
 * deployment convenience, so a typo'd env var must not silently disable IP
 * trust boundary checks instead of visibly failing closed).
 */
function parseTrustedProxyCount(raw: string | undefined): number {
  if (raw === undefined) return process.env.VERCEL === '1' ? 1 : 0;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(
      `[auth-policy] TRUSTED_PROXY_COUNT="${raw}" is not a valid non-negative integer. ` +
      'Falling back to 0 (trust no proxy hop) — IP-based security features will fail ' +
      'closed instead of trusting a spoofable header. Fix TRUSTED_PROXY_COUNT in your environment.'
    );
    return 0;
  }

  return parsed;
}

// Vercel terminates one trusted proxy hop before the application. Keep the
// explicit environment override for other topologies, while avoiding an
// unsafe client-IP default on direct/self-hosted deployments.
export const TRUSTED_PROXY_COUNT = parseTrustedProxyCount(process.env.TRUSTED_PROXY_COUNT);

/**
 * Deployment-topology status for `TRUSTED_PROXY_COUNT`.
 *
 * `resolveTrustedClientIp()` returns `''` whenever the count is 0 — which
 * silently disables every IP-based security feature downstream
 * (rate limiting, audit logging, abuse protection). Callers and deploy
 * checks need to distinguish "operator explicitly chose direct-to-backend
 * (0)" from "nobody configured anything", because only the second case is
 * a misconfiguration worth failing loudly on.
 */
export interface TrustedProxyConfig {
  /** Effective hop count after parsing (0 = trust nothing). */
  count: number;
  /** True only when `TRUSTED_PROXY_COUNT` was explicitly set in the env. */
  isExplicit: boolean;
  /** Where the effective value came from (for logs / deploy checks). */
  source: "env" | "vercel-default" | "fail-closed-default";
}

export function getTrustedProxyConfig(): TrustedProxyConfig {
  const raw = process.env.TRUSTED_PROXY_COUNT;
  if (raw !== undefined) {
    return { count: TRUSTED_PROXY_COUNT, isExplicit: true, source: "env" };
  }
  if (process.env.VERCEL === "1") {
    return { count: TRUSTED_PROXY_COUNT, isExplicit: false, source: "vercel-default" };
  }
  return { count: TRUSTED_PROXY_COUNT, isExplicit: false, source: "fail-closed-default" };
}

/**
 * True when a real client IP can be resolved for this deployment
 * (at least one trusted hop configured). When false, IP-based security
 * features MUST treat the client as unidentified rather than bucketing
 * everybody under a shared "unknown" key.
 */
export function isClientIpResolvable(): boolean {
  return TRUSTED_PROXY_COUNT > 0;
}

/**
 * Validate TRUSTED_PROXY_COUNT configuration.
 *
 * Returns `true` when the configuration is sound, `false` when the
 * deployment is running production without an explicit setting outside
 * Vercel — the exact misconfiguration that makes `resolveTrustedClientIp`
 * return `''` for every request. The `false` case logs an ERROR (not a
 * warning) because IP-based rate limiting / audit / abuse protection are
 * silently dead in that state.
 */
export function validateTrustedProxyCount(): boolean {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.TRUSTED_PROXY_COUNT === undefined &&
    process.env.VERCEL !== '1'
  ) {
    console.error(
      '[auth-policy] TRUSTED_PROXY_COUNT is NOT SET in production and this is not Vercel. ' +
      'resolveTrustedClientIp() will return \'\' for every request, so IP-based rate limiting, ' +
      'audit logging, and abuse protection are DISABLED. ' +
      'Set TRUSTED_PROXY_COUNT to match your deployment topology ' +
      '(0 = direct to backend, 1 = single CDN/proxy, 2 = CDN + reverse proxy). ' +
      'Failing the deploy check until this is set explicitly.'
    );
    return false;
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.TRUSTED_PROXY_COUNT &&
    process.env.VERCEL !== '1'
  ) {
    console.warn(
      '[auth-policy] TRUSTED_PROXY_COUNT not set in production. ' +
      'If using a CDN or reverse proxy, this will cause IP-based security ' +
      'features (rate limiting, audit logging, abuse protection) to fail. ' +
      'Set TRUSTED_PROXY_COUNT to match your deployment topology.'
    );
  }
  return true;
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
  // With no explicitly trusted proxy, no request header is a safe client
  // identity. Callers must fail closed instead of putting every client in a
  // shared "unknown" rate-limit bucket.
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
