import { describe, it, expect, vi, beforeEach } from "vitest";

// نحاكي عميل الـ API — هذه اختبارات وحدة لمنطق الخدمة وليست للشبكة.
vi.mock("@/lib/api/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

import { apiClient, ApiError } from "@/lib/api/api-client";
import { login, verifyMfa, getSocialLoginUrl, getDeviceName } from "@/services/auth/login-service";

const mockedPost = vi.mocked(apiClient.post);
const mockedGet = vi.mocked(apiClient.get);

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when the backend establishes a session", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: false });

    const result = await login({ identifier: "student@thanawy.com", password: "secret" });

    expect(result).toEqual({ success: true, requiresMfa: false, challenge: null });
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("trims the identifier before sending", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ identifier: "  student@thanawy.com  ", password: "secret" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toMatchObject({ identifier: "student@thanawy.com" });
  });

  it("sends both identifier aliases (email + identifier)", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ identifier: "student@thanawy.com", password: "secret" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("email", "student@thanawy.com");
    expect(payload).toHaveProperty("identifier", "student@thanawy.com");
  });

  it("omits fingerprint when not provided", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ identifier: "a@b.c", password: "x" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).not.toHaveProperty("fingerprint");
  });

  it("includes fingerprint when provided", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ identifier: "a@b.c", password: "x", fingerprint: "fp-123" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("fingerprint", "fp-123");
  });

  it("defaults rememberMe to false", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ identifier: "a@b.c", password: "x" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("rememberMe", false);
  });

  // ─── تدفق MFA ───────────────────────────────────────────────────────────
  it("reports requiresMfa with the ticket challenge", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true, ticket: "challenge-ticket" });

    const result = await login({ identifier: "a@b.c", password: "x" });

    expect(result).toEqual({
      success: false,
      requiresMfa: true,
      challenge: "challenge-ticket",
    });
  });

  it("falls back to legacy userId spelling for the challenge", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true, userId: "legacy-handle" });

    const result = await login({ identifier: "a@b.c", password: "x" });

    expect(result.challenge).toBe("legacy-handle");
  });

  it("challenge is null when the backend returns neither spelling", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true });

    const result = await login({ identifier: "a@b.c", password: "x" });

    expect(result.challenge).toBeNull();
  });

  // ─── الأخطاء ────────────────────────────────────────────────────────────
  it("never throws — returns the ApiError message", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("بيانات الدخول غير صحيحة", 401));

    const result = await login({ identifier: "a@b.c", password: "wrong" });

    expect(result.success).toBe(false);
    expect(result.requiresMfa).toBe(false);
    expect(result.error).toBe("بيانات الدخول غير صحيحة");
  });

  it("uses the fallback message for non-Error failures", async () => {
    mockedPost.mockRejectedValueOnce("network glitch");

    const result = await login({ identifier: "a@b.c", password: "x" });

    expect(result.error).toBe("فشل تسجيل الدخول");
  });
});

describe("verifyMfa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds when the backend accepts the code", async () => {
    mockedPost.mockResolvedValueOnce({});

    const result = await verifyMfa("ticket-1", "123456");

    expect(result.success).toBe(true);
    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toMatchObject({ ticket: "ticket-1", userId: "ticket-1", code: "123456" });
  });

  it("trims the code before sending", async () => {
    mockedPost.mockResolvedValueOnce({});

    await verifyMfa("ticket-1", "  123456  ");

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("code", "123456");
  });

  it("keeps the challenge and surfaces the error on failure", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("رمز غير صالح", 400));

    const result = await verifyMfa("ticket-1", "000000");

    expect(result.success).toBe(false);
    expect(result.challenge).toBe("ticket-1");
    expect(result.error).toBe("رمز غير صالح");
  });
});

describe("getSocialLoginUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a valid HTTPS redirect URL", async () => {
    mockedGet.mockResolvedValueOnce({
      redirectUrl: "https://accounts.google.com/o/oauth2/auth?client_id=x",
    });

    const url = await getSocialLoginUrl("google");

    expect(url).toMatch(/^https:\/\/accounts\.google\.com/);
  });

  it("throws on a non-HTTPS URL (open-redirect guard)", async () => {
    mockedGet.mockResolvedValueOnce({ redirectUrl: "http://evil.com/callback" });

    await expect(getSocialLoginUrl("google")).rejects.toThrow("رابط تسجيل الدخول الاجتماعي غير صالح");
  });

  it("throws on a protocol-relative URL", async () => {
    mockedGet.mockResolvedValueOnce({ redirectUrl: "//evil.com/callback" });

    await expect(getSocialLoginUrl("apple")).rejects.toThrow();
  });

  it("throws on an attacker-controlled javascript: URL", async () => {
    mockedGet.mockResolvedValueOnce({ redirectUrl: "javascript:alert(1)" });

    await expect(getSocialLoginUrl("google")).rejects.toThrow();
  });

  it("throws when the backend returns no URL", async () => {
    mockedGet.mockResolvedValueOnce({});

    await expect(getSocialLoginUrl("google")).rejects.toThrow();
  });
});

describe("getDeviceName", () => {
  it("returns a human-readable label in jsdom", () => {
    const name = getDeviceName();
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name).toContain("(");
  });
});
