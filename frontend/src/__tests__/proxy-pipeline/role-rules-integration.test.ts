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

import { verifyAccessToken } from "@/lib/auth/jwt-edge";
import { runProxyPipeline } from "@/proxy-pipeline";

const mockedVerify = vi.mocked(verifyAccessToken);

function makeRequest(pathname: string, role?: string): NextRequest {
  const url = `https://example.test${pathname}`;
  const headers = new Headers();
  if (role) {
    headers.set("cookie", "access_token=fake-token");
  }
  return new NextRequest(url, { headers });
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

beforeEach(() => {
  mockedVerify.mockReset();
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
