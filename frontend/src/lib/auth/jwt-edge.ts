import { jwtVerify, importSPKI } from "jose";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getBackendApiUrl } from "@/lib/api/backend-url";
import {
  canUseLegacyJwtSecret,
  resolveTrustedClientIp,
} from "@/lib/security/policy/auth-policy";

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
 *   Edge runtime     : JWT_PUBLIC_KEY  (PEM SPKI, RS256)
 *   Backend / issuer : JWT_PRIVATE_KEY (never leaves the backend)
 *
 * A leak of `JWT_PUBLIC_KEY` cannot be used to forge tokens. The backend
 * can be redeployed without rotating the edge, and the edge can be
 * replicated horizontally without ever needing the signing key.
 *
 * Production requires JWT_PUBLIC_KEY plus both expected claims. It verifies
 * RS256 only. JWT_SECRET is accepted only in development; migration mode is
 * not a production bypass.
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
 * Set JWT_EXPECTED_ISSUER and JWT_EXPECTED_AUDIENCE in the edge env. They are
 * mandatory in production and verification always pins both values.
 */
const EXPECTED_ISSUER = process.env.JWT_EXPECTED_ISSUER;
const EXPECTED_AUDIENCE = process.env.JWT_EXPECTED_AUDIENCE;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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
 * returns no identity when the trusted proxy count is not configured.
 *
 * Set this to the number of trusted hops in your deployment, e.g.:
 *   - direct CDN edge (Vercel/Cloudflare) → 1
 *   - CDN + custom reverse proxy            → 2
 */
/**
 * Derive the real client IP without trusting attacker-controlled
 * X-Forwarded-For values. See TRUSTED_PROXY_COUNT above for the policy.
 */
function resolveClientIp(request: NextRequest): string {
  return resolveTrustedClientIp(request);
}

let loggedMissingKey = false;

type VerifyKey =
  | { kind: "spki"; cryptoKey: CryptoKey }
  | { kind: "hs256"; key: Uint8Array };

let cachedKey: VerifyKey | null = null;
let pendingImport: Promise<VerifyKey | null> | null = null;

async function getKey(): Promise<VerifyKey | null> {
  if (cachedKey) return cachedKey;

  // Production contract: the backend and edge use RS256. The edge only has
  // the public key, so it can verify tokens but cannot forge new ones.
  if (process.env.JWT_PUBLIC_KEY) {
    if (!pendingImport) {
      pendingImport = (async () => {
        const spkiPem = process.env.JWT_PUBLIC_KEY!;
        try {
          const cryptoKey = await importSPKI(spkiPem, "RS256");
          cachedKey = { kind: "spki", cryptoKey };
          return cachedKey;
        } catch {
          // Fall through to a closed verification result.
        }
        console.error(
          "[jwt-edge] JWT_PUBLIC_KEY is set but could not be imported as RS256. " +
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

  // JWT_SECRET is allowed only under the shared legacy-secret policy.
  const allowLegacySecret = canUseLegacyJwtSecret();
  const secret = allowLegacySecret ? process.env.JWT_SECRET : undefined;
  if (secret) {
    if (IS_PRODUCTION) {
      console.error(
        "[jwt-edge] JWT_SECRET is forbidden in production. Use JWT_PUBLIC_KEY for asymmetric verification."
      );
      return null;
    }
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
        "Set JWT_PUBLIC_KEY (asymmetric) for edge verification."
      );
    }
    return null;
  }

  if (IS_PRODUCTION && (!EXPECTED_ISSUER || !EXPECTED_AUDIENCE)) {
    if (!loggedMissingKey) {
      loggedMissingKey = true;
      console.error(
        "[jwt-edge] JWT_EXPECTED_ISSUER and JWT_EXPECTED_AUDIENCE are required in production."
      );
    }
    return null;
  }

  try {
    const verifyOpts: Parameters<typeof jwtVerify>[2] = {
      algorithms: key.kind === "spki" ? ["RS256"] : ["HS256"],
      issuer: EXPECTED_ISSUER,
      audience: EXPECTED_AUDIENCE,
    };

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
  // getBackendApiUrl() applies the canonical /api/v1 composition and throws
  // in production when no backend URL is configured.
  try {
    getBackendApiUrl('/auth/refresh');
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

    const refreshRes = await fetch(getBackendApiUrl('/auth/refresh'), {
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

      // NOTE: If the backend doesn't return Set-Cookie headers, we treat the
      // refresh as failed. The backend is the sole source of truth for cookie
      // attributes, token rotation, and session lifetime. The frontend must not
      // construct cookies or override cookie attributes — that was the root cause
      // of inconsistencies between what the backend sets and what the frontend
      // imposed.
      if (!setCookies || setCookies.length === 0) {
        return { payload: null, cookies: [] };
      }

      return {
        payload,
        cookies: setCookies,
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
