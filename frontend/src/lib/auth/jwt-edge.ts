import { jwtVerify, decodeJwt as decodeJwtUnverified } from "jose";
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
 * DEGRADED MODE
 * -------------
 * `JWT_SECRET` is only defined in this repo's `.env.production` — the local
 * dev env files don't set it (the local backend may run with its own
 * secret that isn't shared with the frontend). When it's missing, this module
 * logs one warning and falls back to the old unverified decode so local
 * development keeps working. In that mode the middleware is UI-routing only,
 * NOT a security boundary — the backend remains the authority. Never treat a
 * missing-secret warning as acceptable in production.
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

/** Unverified fallback — only reached when JWT_SECRET is not configured. */
function decodeUnverified(token: string): AccessTokenPayload | null {
  try {
    return decodeJwtUnverified(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies an access token's signature and expiry.
 *
 * Returns the payload only when the token is cryptographically valid (or, in
 * degraded mode without `JWT_SECRET`, merely well-formed). Returns `null` for
 * a missing, forged, malformed, or expired token — callers treat that
 * identically to "no token" and fall back to the refresh-token flow / login
 * redirect. Never throws.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  const key = getSecretKey();

  if (!key) {
    if (!loggedMissingSecret) {
      loggedMissingSecret = true;
      console.warn(
        "[jwt-edge] JWT_SECRET is not set — access tokens are NOT signature-verified at the edge. " +
        "Routing decisions in proxy.ts are UI-only in this mode; this must never be true in production."
      );
    }
    return decodeUnverified(token);
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
): Promise<{ payload: AccessTokenPayload | null; cookies: string[] }> {
  let backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";
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
      const setCookies = refreshRes.headers.getSetCookie();
      let payload: AccessTokenPayload | null = null;

      if (setCookies && setCookies.length > 0) {
        const data = await refreshRes.json().catch(() => null);
        const tokenStr = data?.data?.accessToken || data?.accessToken;
        if (tokenStr) {
          payload = await verifyAccessToken(tokenStr);
        }
      }

      return { payload, cookies: setCookies || [] };
    }

    return { payload: null, cookies: [] };
  } catch (_err) {
    console.error('Token refresh failed:', _err);
    return { payload: null, cookies: [] };
  }
}
