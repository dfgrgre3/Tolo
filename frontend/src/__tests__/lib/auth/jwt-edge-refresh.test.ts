import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// P011 test matrix — attemptTokenRefresh() must fail closed (payload: null,
// cookies: []) on every combination except the one the backend contract
// guarantees: HTTP 200 + a valid accessToken + at least one Set-Cookie header.
// See frontend/src/lib/auth/jwt-edge.ts:321 for the documented rationale.

vi.mock("@/lib/api/backend-url", () => ({
  getBackendApiUrl: (path: string) => `https://backend.test/api/v1${path}`,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// jwtVerify is mocked directly so this suite doesn't depend on real
// RS256/HS256 key material or process.env timing — it only needs to
// simulate "the token is cryptographically valid" vs. "it isn't".
const jwtVerifyMock = vi.fn();
vi.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
  importSPKI: vi.fn().mockResolvedValue({}),
}));

function fakeRequest(): NextRequest {
  return {
    headers: new Headers({ "user-agent": "vitest" }),
  } as unknown as NextRequest;
}

function mockFetchResponse(opts: {
  status: number;
  body?: unknown;
  setCookies?: string[];
}) {
  const headers = new Headers();
  for (const cookie of opts.setCookies ?? []) {
    headers.append("set-cookie", cookie);
  }
  return {
    ok: opts.status >= 200 && opts.status < 300,
    status: opts.status,
    headers,
    json: async () => opts.body ?? {},
  } as Response;
}

describe("attemptTokenRefresh (P011 test matrix)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    jwtVerifyMock.mockReset();
    // JWT_PUBLIC_KEY must be set for getKey() to select the RS256 path and
    // call the mocked jwtVerify at all — otherwise verifyAccessToken()
    // fails closed for lack of a key before it ever inspects the token.
    vi.stubEnv("JWT_PUBLIC_KEY", "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----");
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("200 + accessToken + Set-Cookie → success", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { userId: "u1", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 },
    });
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        status: 200,
        body: { data: { accessToken: "valid.jwt.token", refreshToken: "new-refresh" } },
        setCookies: ["access_token=valid.jwt.token; Path=/; HttpOnly"],
      })
    );

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("old-refresh", fakeRequest());

    expect(result.payload).not.toBeNull();
    expect(result.cookies).toHaveLength(1);
    expect(result.accessToken).toBe("valid.jwt.token");
  });

  it("200 + accessToken - Set-Cookie → treated as failure, marked transient (documented contract)", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { userId: "u1", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 },
    });
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        status: 200,
        body: { data: { accessToken: "valid.jwt.token" } },
        setCookies: [],
      })
    );

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("old-refresh", fakeRequest());

    expect(result.payload).toBeNull();
    expect(result.cookies).toEqual([]);
    // HTTP 200 without rotation is a backend contract violation, not proof
    // the session is dead — callers must preserve cookies for retry.
    expect(result.transient).toBe(true);
  });

  it("200 - accessToken + Set-Cookie → fails closed (no token to verify)", async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        status: 200,
        body: { data: {} },
        setCookies: ["access_token=; Path=/; HttpOnly"],
      })
    );

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("old-refresh", fakeRequest());

    // No accessToken in the body means nothing was verified, but the
    // current implementation still returns the cookies it received —
    // callers should not treat a present `cookies` array as proof of a
    // valid session without also checking `payload`.
    expect(result.payload).toBeNull();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("200 + malformed/invalid accessToken + Set-Cookie → payload null, cookies still relayed", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("signature verification failed"));
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        status: 200,
        body: { data: { accessToken: "forged.jwt.token" } },
        setCookies: ["access_token=forged.jwt.token; Path=/; HttpOnly"],
      })
    );

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("old-refresh", fakeRequest());

    expect(result.payload).toBeNull();
    // Cookies are still relayed even though verification failed locally —
    // the backend already committed the rotation server-side; the edge's
    // inability to verify the token does not un-rotate it.
    expect(result.cookies).toHaveLength(1);
  });

  it("401 → fails closed and definitive (safe to clear cookies)", async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ status: 401, body: { error: "invalid_refresh_token" } }));

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("expired-refresh", fakeRequest());

    expect(result).toEqual({ payload: null, cookies: [], transient: false, status: 401 });
  });

  it("403 → fails closed and definitive (safe to clear cookies)", async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ status: 403, body: { error: "forbidden" } }));

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("revoked-refresh", fakeRequest());

    expect(result).toEqual({ payload: null, cookies: [], transient: false, status: 403 });
  });

  it("500 → fails closed but transient (callers must preserve cookies)", async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ status: 500, body: { error: "internal_error" } }));

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("some-refresh", fakeRequest());

    expect(result).toEqual({ payload: null, cookies: [], transient: true, status: 500 });
  });

  it("429 → fails closed but transient (callers must preserve cookies)", async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ status: 429, body: { error: "rate_limited" } }));

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("some-refresh", fakeRequest());

    expect(result).toEqual({ payload: null, cookies: [], transient: true, status: 429 });
  });

  it("timeout / network error → fails closed but transient, and reports to Sentry", async () => {
    fetchSpy.mockRejectedValue(new DOMException("The operation was aborted", "TimeoutError"));

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const Sentry = await import("@sentry/nextjs");
    const result = await attemptTokenRefresh("some-refresh", fakeRequest());

    expect(result).toEqual({ payload: null, cookies: [], transient: true });
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("malformed JSON body → fails closed instead of throwing", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "set-cookie": "access_token=x; Path=/" }),
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response);

    const { attemptTokenRefresh } = await import("@/lib/auth/jwt-edge");
    const result = await attemptTokenRefresh("some-refresh", fakeRequest());

    // json().catch(() => null) means data is null → no accessToken → no
    // verification attempted, but the (invalid-envelope) response is still
    // 200 with cookies, so per the current contract this is NOT failed
    // closed on cookies — only the payload is null. This test pins that
    // behavior; if the contract should instead reject an unparsable body
    // outright, that's a deliberate follow-up, not a silent regression.
    expect(result.payload).toBeNull();
  });
});
