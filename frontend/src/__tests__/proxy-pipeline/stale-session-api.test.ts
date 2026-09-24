import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Stale-session regression guard for API requests.
 *
 * The page gate already treats "unverifiable access_token + no refresh_token"
 * as a dead session (redirect + clear cookies). The API branch previously
 * did NOT: it forwarded the doomed request, the backend 401'd, and the dead
 * cookie survived — so the root layout kept reporting hasSessionHint and the
 * client re-probed /auth/me with a fresh 401 on every page load.
 *
 * This suite pins the API-side parity: answer 401 at the edge and expire the
 * stale cookie so the loop dies after the first request.
 */

vi.mock("@/lib/auth/jwt-edge", () => ({
  verifyAccessToken: vi.fn(),
  attemptTokenRefresh: vi.fn(async () => ({ payload: null, cookies: [] })),
}));

vi.mock("@/lib/security/csp", () => ({
  generateNonce: () => "test-nonce",
  applyCsp: (response: Response) => response,
}));

import { attemptTokenRefresh, verifyAccessToken } from "@/lib/auth/jwt-edge";
import { runProxyPipeline } from "@/proxy-pipeline";

const mockedVerify = vi.mocked(verifyAccessToken);
const mockedRefresh = vi.mocked(attemptTokenRefresh);

function makeApiRequest(
  pathname: string,
  options: { accessToken?: string; refreshToken?: string } = {},
): NextRequest {
  const url = `https://example.test${pathname}`;
  const headers = new Headers();
  const cookies: string[] = [];
  if (options.accessToken) cookies.push(`access_token=${options.accessToken}`);
  if (options.refreshToken) cookies.push(`refresh_token=${options.refreshToken}`);
  if (cookies.length > 0) headers.set("cookie", cookies.join("; "));
  return new NextRequest(url, { headers });
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

beforeEach(() => {
  mockedVerify.mockReset();
  mockedRefresh.mockReset();
  mockedRefresh.mockResolvedValue({ payload: null, cookies: [] });
});

describe("runProxyPipeline: stale access token on API requests", () => {
  it("answers 401 at the edge and clears the stale cookie when there is no refresh_token", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(
      makeApiRequest("/api/v1/auth/me", { accessToken: "dead-token" }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
    // The dead cookie must be expired so the browser stops sending it —
    // this is what breaks the hasSessionHint → /auth/me → 401 loop.
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;[^|]*Max-Age=0/);
    // No refresh token exists, so no refresh round-trip may be attempted.
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("applies the same dead-session rule to non-auth API paths", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(
      makeApiRequest("/api/users/profile", { accessToken: "dead-token" }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;/);
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("does not short-circuit a guest request (no cookies at all)", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(makeApiRequest("/api/v1/auth/me"));
    // Pass-through to the BFF route handler, not an edge 401: a guest probe
    // carries nothing to clear and the backend owns the guest 401 contract.
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("still attempts refresh when a refresh_token is present", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: false, status: 401 });
    const res = await runProxyPipeline(
      makeApiRequest("/api/v1/auth/me", {
        accessToken: "dead-token",
        refreshToken: "rt-stale-api-definitive",
      }),
    );
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    // Definitive refresh failure: 401 with the dead cookies cleared
    // (existing behavior — pinned here so the new no-refresh branch does
    // not swallow it).
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;|refresh_token=;/);
  });

  it("leaves public API endpoints untouched even with a stale cookie", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(
      makeApiRequest("/api/courses", { accessToken: "dead-token" }),
    );
    // Public content must not 401 at the edge; the stale cookie is harmless
    // here because public endpoints don't authenticate.
    expect(res.status).not.toBe(401);
  });

  it("passes through when the access token verifies", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(
      makeApiRequest("/api/v1/auth/me", { accessToken: "valid-token" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
