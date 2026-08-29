import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

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
 * that gap by verifying the signature with the same HS256 secret the backend
 * signs with, so a forged cookie is rejected here too.
 *
 * MISSING SECRET — FAIL CLOSED
 * ----------------------------
 * If `JWT_SECRET` is not configured, EVERY token is treated as invalid
 * (returns `null`) and callers fall back to the refresh flow / login
 * redirect. The old "degraded mode" that fell back to unverified base64
 * decoding was removed: accepting a self-asserted `role` claim without a
 * signature re-opened the exact forgery this module exists to prevent.
 */

export interface AccessTokenPayload {
  userId?: string;
  role?: string;
  email?: string;
  exp?: number;
}

let loggedMissingSecret = false;

function getSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Verifies an access token's signature and expiry.
 *
 * Returns the payload only when the token is cryptographically valid. Returns
 * `null` for a missing secret, forged, malformed, or expired token — callers
 * treat that identically to "no token" and fall back to the refresh-token
 * flow / login redirect. Never throws.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  const key = getSecretKey();

  if (!key) {
    // FAIL CLOSED: without the secret we cannot prove the token's origin,
    // so it must be treated as untrusted rather than decoded unverified.
    if (!loggedMissingSecret) {
      loggedMissingSecret = true;
      console.error(
        "[jwt-edge] JWT_SECRET is not set — rejecting every access token (fail-closed). " +
        "Set JWT_SECRET to the backend's HS256 signing secret; unverified decode is no longer supported."
      );
    }
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as AccessTokenPayload;
  } catch {
    // Bad signature, malformed token, or expired — all handled the same way
    // by the caller (attempt refresh, else redirect to login).
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
  let backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8082";
  backendUrl = backendUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

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

    const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: "POST",
      headers,
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
    console.error('Token refresh failed:', _err);
    return { payload: null, cookies: [] };
  }
}
