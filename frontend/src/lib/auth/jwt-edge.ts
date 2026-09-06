import { jwtVerify, importSPKI } from "jose";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getBackendUrl } from "@/lib/api/backend-url";

/**
 * Edge-safe JWT verification for the Next.js middleware (`src/proxy.ts`).
 *
 * WHY THIS FILE EXISTS
 * ---------------------
 * The middleware reads `role`/`exp` out of the `access_token` cookie to make
 * routing decisions (redirect guests away from /login, gate `/admin/*`,
 * teacher/student-only API paths, ...) *before* the request reaches the Go
 * backend. The previous implementation only base64-decoded the JWT payload —
 * it never checked the signature. That meant anyone who hand-edited their own
 * `access_token` cookie to a well-formed three-part base64 blob containing
 * `role: "SUPER_ADMIN"` would sail straight past this layer: the real API
 * calls would still be rejected by the backend's own JWT validation, but the
 * middleware would happily render the admin shell first. This module closes
 * that gap by verifying the signature against the backend's signing key,
 * so a forged cookie is rejected here too.
 *
 * WHY AN ASYMMETRIC KEY
 * ---------------------
 * The frontend edge and the backend historically shared the same HS256
 * secret. That means the signing secret had to be present in two places —
 * a sensitive value on every frontend edge node. Anyone who reads
 * `JWT_SECRET` from the edge can mint a valid `access_token` for any
 * role, because HS256 verification and signing use the same key.
 *
 * The fix is to verify with an asymmetric public key on the edge while
 * the backend keeps the private key for signing:
 *
 *   Edge runtime     : JWT_PUBLIC_KEY  (PEM SPKI, e.g. EdDSA "ed25519")
 *   Backend / issuer : JWT_PRIVATE_KEY (never leaves the backend)
 *
 * A leak of `JWT_PUBLIC_KEY` cannot be used to forge tokens. The backend
 * can be redeployed without rotating the edge, and the edge can be
 * replicated horizontally without ever needing the signing key.
 *
 * LEGACY FALLBACK
 * ---------------
 * For backward compatibility, if `JWT_PUBLIC_KEY` is not set we still
 * accept the historical `JWT_SECRET` and verify with HS256. New
 * deployments should set `JWT_PUBLIC_KEY` and rotate `JWT_SECRET` away
 * from the edge as soon as possible.
 *
 * MISSING KEY — FAIL CLOSED
 * -------------------------
 * If neither `JWT_PUBLIC_KEY` nor `JWT_SECRET` is configured, EVERY
 * token is treated as invalid (returns `null`) and callers fall back to
 * the refresh flow / login redirect. The old "degraded mode" that
 * fell back to unverified base64 decoding was removed: accepting a
 * self-asserted `role` claim without a signature re-opened the exact
 * forgery this module exists to prevent.
 */

export interface AccessTokenPayload {
  userId?: string;
  role?: string;
  email?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  sub?: string;
}

/**
 * Required JWT contract enforced at the edge.
 *
 * `jwtVerify` validates signature/alg/exp by default. We additionally
 * pin `iss` and `aud` so a token signed by the correct key but issued
 * for a different tenant / service cannot be replayed against us.
 *
 * Set JWT_EXPECTED_ISSUER and JWT_EXPECTED_AUDIENCE in the edge env to
 * match the backend's issuer/audience claims. When unset we fall back to
 * the historical "any iss/aud accepted" behaviour for backward
 * compatibility, but new deployments MUST set both.
 */
const EXPECTED_ISSUER = process.env.JWT_EXPECTED_ISSUER || "";
const EXPECTED_AUDIENCE = process.env.JWT_EXPECTED_AUDIENCE || "";

/**
 * Number of trusted reverse proxies in front of this edge runtime.
 *
 * X-Forwarded-For is a comma-separated chain: `client, proxy1, proxy2`.
 * The leftmost value is the one the original client (or an attacker)
 * controls, so blindly trusting it lets an attacker spoof their IP and
 * bypass rate-limiting / audit / abuse detection.
 *
 * When TRUSTED_PROXY_COUNT > 0 we treat the RIGHTMOST N hops as trusted
 * (they were appended by proxies we control) and pick the value just
 * before that boundary as the real client IP. When unset (= 0) we fall
 * back to `x-real-ip` (set by a single trusted reverse proxy) and
 * IGNORE the spoofable X-Forwarded-For entirely.
 *
 * Set this to the number of trusted hops in your deployment, e.g.:
 *   - direct CDN edge (Vercel/Cloudflare) → 1
 *   - CDN + custom reverse proxy            → 2
 */
const TRUSTED_PROXY_COUNT = Number(process.env.TRUSTED_PROXY_COUNT || 0);

/**
 * Derive the real client IP without trusting attacker-controlled
 * X-Forwarded-For values. See TRUSTED_PROXY_COUNT above for the policy.
 */
function resolveClientIp(request: NextRequest): string {
  // Prefer x-real-ip from a single trusted reverse proxy. This header is
  // set by the proxy and not by the client, so it cannot be spoofed.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  if (TRUSTED_PROXY_COUNT > 0) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
      // The rightmost TRUSTED_PROXY_COUNT hops are trusted. The hop just
      // before them is the client we want.
      const trustedStart = Math.max(0, hops.length - TRUSTED_PROXY_COUNT);
      const clientIdx = trustedStart - 1;
      if (clientIdx >= 0 && hops[clientIdx]) return hops[clientIdx];
      // Chain shorter than expected trusted hops — fall through to next.
    }
  }

  // Untrusted deployment without TRUSTED_PROXY_COUNT: do NOT pass
  // attacker-controllable X-Forwarded-For through. Empty string lets the
  // backend log "unknown" rather than a spoofed value.
  return "";
}

let loggedMissingKey = false;

type VerifyKey =
  | { kind: "spki"; alg: "EdDSA" | "RS256"; cryptoKey: CryptoKey }
  | { kind: "hs256"; key: Uint8Array };

let cachedKey: VerifyKey | null = null;
let pendingImport: Promise<VerifyKey | null> | null = null;

async function getKey(): Promise<VerifyKey | null> {
  if (cachedKey) return cachedKey;

  // Preferred: asymmetric public key (EdDSA / RS256). The edge runtime
  // can verify with this but cannot forge new tokens.
  if (process.env.JWT_PUBLIC_KEY) {
    if (!pendingImport) {
      pendingImport = (async () => {
        const spkiPem = process.env.JWT_PUBLIC_KEY!;
        for (const alg of ["EdDSA", "RS256"] as const) {
          try {
            const cryptoKey = await importSPKI(spkiPem, alg);
            cachedKey = { kind: "spki", alg, cryptoKey };
            return cachedKey;
          } catch {
            // Try next alg.
          }
        }
        console.error(
          "[jwt-edge] JWT_PUBLIC_KEY is set but could not be imported as EdDSA or RS256. " +
          "Check that the PEM is a valid SubjectPublicKeyInfo."
        );
        pendingImport = null;
        return null;
      })();
    }
    try {
      return await pendingImport;
    } catch {
      return null;
    }
  }

  // Legacy fallback: shared HS256 secret. Kept for backward compatibility
  // only — set JWT_PUBLIC_KEY and remove JWT_SECRET from the edge env.
  const secret = process.env.JWT_SECRET;
  if (secret) {
    cachedKey = { kind: "hs256", key: new TextEncoder().encode(secret) };
    return cachedKey;
  }

  return null;
}

/**
 * Verifies an access token's signature and expiry.
 *
 * Returns the payload only when the token is cryptographically valid. Returns
 * `null` for a missing key, forged, malformed, or expired token — callers
 * treat that identically to "no token" and fall back to the refresh-token
 * flow / login redirect. Never throws.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  const key = await getKey();

  if (!key) {
    // FAIL CLOSED: without a verification key we cannot prove the
    // token's origin, so it must be treated as untrusted rather than
    // decoded unverified.
    if (!loggedMissingKey) {
      loggedMissingKey = true;
      console.error(
        "[jwt-edge] No JWT verification key configured — rejecting every access token (fail-closed). " +
        "Set JWT_PUBLIC_KEY (preferred, asymmetric) or JWT_SECRET (legacy HS256)."
      );
    }
    return null;
  }

  try {
    const verifyOpts: Parameters<typeof jwtVerify>[2] = {
      algorithms: key.kind === "spki" ? [key.alg] : ["HS256"],
    };
    // Pin issuer/audience when configured. jose throws if they don't match,
    // which our catch block treats as "invalid token" → fail-closed.
    if (EXPECTED_ISSUER) verifyOpts.issuer = EXPECTED_ISSUER;
    if (EXPECTED_AUDIENCE) verifyOpts.audience = EXPECTED_AUDIENCE;

    const { payload } = key.kind === "spki"
      ? await jwtVerify(token, key.cryptoKey, verifyOpts)
      : await jwtVerify(token, key.key, verifyOpts);

    const p = payload as AccessTokenPayload;
    // Enforce required claims (per the contract). Missing sub/userId/exp
    // means the token is malformed for our use even if the signature is
    // valid — e.g., an internal-service token with no user identity.
    if (p.exp === undefined) return null;
    if (!p.userId && !p.sub) return null;
    return p;
  } catch {
    // Bad signature, malformed token, expired, or wrong iss/aud — all
    // handled the same way by the caller (attempt refresh, else redirect
    // to login).
    return null;
  }
}

/**
 * Attempts to refresh the access token using the refresh token.
 * Returns the verified payload if successful, null otherwise.
 */
export async function attemptTokenRefresh(
  refreshToken: string,
  request: NextRequest
): Promise<{
  payload: AccessTokenPayload | null;
  cookies: string[];
  accessToken?: string;
  refreshToken?: string;
}> {
  // getBackendUrl() normalizes trailing /api and slashes, and throws in
  // production when no backend URL is configured — matching the policy of
  // every other server-side caller.
  let backendUrl: string;
  try {
    backendUrl = getBackendUrl();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "jwt-edge:refresh" },
      extra: { reason: "backend URL not configured" },
    });
    return { payload: null, cookies: [] };
  }

  const clientIp = resolveClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";

  // Hard timeout for the refresh round-trip. If the backend hangs or the
  // network is degraded we MUST fail closed (return null) rather than
  // letting the middleware block on a slow upstream — every middleware
  // pass on every request would inherit that latency.
  //
  // Policy: refresh timeout → fail closed (return null payload, no new
  // cookies). Caller treats this exactly like a refresh failure and
  // either tries again on the next request or redirects to /login.
  const REFRESH_TIMEOUT_MS = Number(process.env.JWT_REFRESH_TIMEOUT_MS || 5000);

  try {
    const headers: Record<string, string> = {
      "Cookie": `refresh_token=${refreshToken}`,
      "Content-Type": "application/json",
    };
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
    }
    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }

    const refreshRes = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
      // AbortSignal.timeout() is available in Node 17.3+ / Edge runtime.
      // On timeout fetch throws an AbortError → caught below → fail closed.
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });

    if (refreshRes.ok) {
      let setCookies = refreshRes.headers.getSetCookie ? refreshRes.headers.getSetCookie() : [];
      const data = await refreshRes.json().catch(() => null);
      const tokenStr = data?.data?.accessToken || data?.accessToken;
      const newRefreshTokenStr = data?.data?.refreshToken || data?.refreshToken;

      let payload: AccessTokenPayload | null = null;
      if (tokenStr) {
        payload = await verifyAccessToken(tokenStr);
      }

      if ((!setCookies || setCookies.length === 0) && tokenStr) {
        setCookies = [
          `access_token=${tokenStr}; Path=/; HttpOnly; SameSite=Lax`,
          `refresh_token=${newRefreshTokenStr || refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
        ];
      }

      return {
        payload,
        cookies: setCookies || [],
        accessToken: tokenStr,
        refreshToken: newRefreshTokenStr || refreshToken,
      };
    }

    return { payload: null, cookies: [] };
  } catch (_err) {
    Sentry.captureException(_err, { tags: { source: "jwt-edge:refresh" } });
    return { payload: null, cookies: [] };
  }
}
