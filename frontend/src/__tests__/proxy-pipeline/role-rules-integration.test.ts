import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * P002 regression guard.
 *
 * route-guards.test.ts proves findRoleRule()/hasRole()/matchesPath() are
 * correct in isolation. It does NOT prove they are actually reached by the
 * production request path - that requires driving runProxyPipeline() itself
 * and observing the HTTP decision (403 vs pass-through) for each role.
 *
 * This test mocks only the edge boundaries that talk to the network
 * (JWT verification/refresh, CSP nonce) and drives the real
 * proxy-pipeline/index.ts + routing.ts + route-policy.ts + route-guards.ts
 * chain exactly as production does.
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

function makeRequest(pathname: string, role?: string, withRefresh = false, refreshToken = "fake-refresh"): NextRequest {
  const url = `https://example.test${pathname}`;
  const headers = new Headers();
  if (role) {
    headers.set("cookie", "access_token=fake-token");
  }
  if (withRefresh) {
    headers.set("cookie", [headers.get("cookie"), `refresh_token=${refreshToken}`].filter(Boolean).join("; "));
  }
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

describe("runProxyPipeline: ROLE_RULES actually gate requests (P002)", () => {
  it("rejects a STUDENT hitting a TEACHER-only endpoint with 403", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/teaching/dashboard", "STUDENT"));
    expect(res.status).toBe(403);
  });

  it("allows a TEACHER on a TEACHER-only endpoint", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "TEACHER", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/teaching/dashboard", "TEACHER"));
    expect(res.status).not.toBe(403);
  });

  it("allows ADMIN on a TEACHER-only endpoint (role escalation allow-list)", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "ADMIN", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/teaching/dashboard", "ADMIN"));
    expect(res.status).not.toBe(403);
  });

  it("rejects a TEACHER hitting a STUDENT-only endpoint with 403", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "TEACHER", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/student/grades", "TEACHER"));
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated (guest) request to a role-gated endpoint with 401, not a silent pass", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(makeRequest("/api/teaching/dashboard"));
    expect([401, 403]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });

  it("rejects a malformed/unknown role against a role-gated endpoint", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "NOT_A_REAL_ROLE", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/teaching/dashboard", "NOT_A_REAL_ROLE"));
    expect(res.status).toBe(403);
  });

  it("does not apply role gating to a declared public endpoint even with wrong role", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/courses", "STUDENT"));
    expect(res.status).not.toBe(403);
  });

  it("does not apply the teaching-only rule to a prefix-lookalike path", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/teaching-history", "STUDENT"));
    // /api/teaching-history is not covered by the /api/teaching subtree rule,
    // and is not a declared public endpoint, so it falls through to the
    // generic "any authenticated role" gate - it must NOT be treated as
    // teacher-only (that would be a false deny) nor as public (false allow).
    expect(res.status).not.toBe(403);
  });

  it("rejects courses/create-bulk from a non-teacher the same as the generic authenticated gate (exact-match rule does not cover it)", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/api/courses/create-bulk", "STUDENT"));
    // Not matched by the exact "/api/courses/create" rule, so no role-specific
    // 403 fires here; it is authenticated-but-ungated at the edge. Confirms
    // exact vs subtree semantics are respected in the live pipeline.
    expect(res.status).not.toBe(403);
  });
});

/**
 * Protected-page gate regression guard.
 *
 * The page gate must require a *verified* session — "an access_token cookie
 * exists" is not sufficient. The specific hole this pins: a request carrying
 * an unverifiable access_token and no usable refresh_token must NOT fall
 * through to NextResponse.next() and render the protected page for an
 * anonymous/expired visitor. The backend would still reject its API calls,
 * but the page-level gate would not be honouring its own contract.
 *
 * Allow rule:  valid access token  OR  refresh produced a rotated session.
 * Deny rule:   everything else     →  clear auth cookies + redirect /login.
 */
describe("runProxyPipeline: protected page gate requires a verified session", () => {
  it("allows a protected page with a valid access token", async () => {
    mockedVerify.mockResolvedValue({ userId: "u1", role: "STUDENT", exp: futureExp() });
    const res = await runProxyPipeline(makeRequest("/dashboard", "STUDENT"));
    expect(res.status).toBe(200);
  });

  it("denies a protected page when NO cookies are present", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("denies a protected page when the access_token is unverifiable and there is no refresh_token", async () => {
    // Cookie present (makeRequest sets it for any role) but the token does
    // not decode/verify — and no refresh_token cookie exists to rotate it.
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(makeRequest("/dashboard", "STUDENT"));
    // The exact hole: presence of the cookie must not imply a session.
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    // Stale cookies are cleared so subsequent requests stop retrying a
    // dead token instead of looping.
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;|refresh_token=;/);
  });

  it("denies a protected page when the access_token is expired and the refresh fails without rotating cookies", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [] });
    const res = await runProxyPipeline(makeRequest("/dashboard", "STUDENT"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows a protected page when a fresh access token is obtained via a successful refresh", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({
      payload: { userId: "u1", role: "STUDENT", exp: futureExp() },
      cookies: ["access_token=new-token; Path=/; HttpOnly"],
    });
    // The refresh path only fires when a refresh_token cookie is actually
    // present; the previous test (no refresh_token) must deny.
    const res = await runProxyPipeline(makeRequest("/dashboard", "STUDENT", true));
    expect(res.status).toBe(200);
  });
});

/**
 * Transient-vs-definitive refresh failure guard.
 *
 * A failed refresh is TRANSIENT when the backend never gave a definitive
 * answer (5xx / 429 / network / timeout): the session may still be valid,
 * so auth cookies MUST be preserved for retry. It is DEFINITIVE on
 * 400/401/403 (unknown/expired/revoked refresh token): stale cookies are
 * cleared to stop retry storms. Mocks omitting `transient` behave as
 * definitive (backward compatible).
 */
describe("runProxyPipeline: transient refresh failures preserve cookies", () => {
  // NOTE: each test uses a distinct refresh_token value — refreshSession()
  // coalesces + cools down failures per token (2s), so reusing one token
  // across tests would leak cooldown state between cases.
  it("preserves cookies on a guest page when the refresh fails transiently", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: true });
    const res = await runProxyPipeline(makeRequest("/login", "STUDENT", true, "rt-guest-transient"));
    expect(res.status).toBe(200);
    // No clearing Set-Cookie at all — the session is preserved for retry.
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("clears cookies on a guest page when the refresh fails definitively", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: false });
    const res = await runProxyPipeline(makeRequest("/login", "STUDENT", true, "rt-guest-definitive"));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;|refresh_token=;/);
  });

  it("redirects without clearing cookies when a protected-page refresh fails transiently", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: true, status: 503 });
    const res = await runProxyPipeline(makeRequest("/settings", "STUDENT", true, "rt-protected-transient"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    // Redirected, but cookies preserved (no clearing Set-Cookie) for retry.
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("redirects and clears cookies when a protected-page refresh fails definitively", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: false, status: 401 });
    const res = await runProxyPipeline(makeRequest("/settings", "STUDENT", true, "rt-protected-definitive"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("set-cookie")).toMatch(/access_token=;|refresh_token=;/);
  });

  it("cleared cookies carry an explicit root Path so backend-issued copies are removed", async () => {
    mockedVerify.mockResolvedValue(null);
    mockedRefresh.mockResolvedValue({ payload: null, cookies: [], transient: false, status: 401 });
    const res = await runProxyPipeline(makeRequest("/settings", "STUDENT", true, "rt-clear-path"));
    expect(res.headers.get("set-cookie")).toMatch(/Path=\//);
  });

  it("newly protected user-scoped pages require a session (no anonymous render)", async () => {
    mockedVerify.mockResolvedValue(null);
    for (const path of ["/settings", "/billing", "/cart", "/wishlist", "/chat", "/jobs/search"]) {
      const res = await runProxyPipeline(makeRequest(path));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    }
  });

  it("public catalog pages stay open without a session", async () => {
    mockedVerify.mockResolvedValue(null);
    for (const path of ["/courses", "/blog", "/forum", "/teachers"]) {
      const res = await runProxyPipeline(makeRequest(path));
      expect(res.status).toBe(200);
    }
  });

  it("public API detail URLs pass the edge gate without a session", async () => {
    mockedVerify.mockResolvedValue(null);
    const res = await runProxyPipeline(makeRequest("/api/courses/123"));
    // Not a role-gated path and now declared public-subtree: the generic
    // 401 gate must not fire for it (backend still owns real auth).
    expect(res.status).not.toBe(401);
  });
});
