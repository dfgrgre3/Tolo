import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockedApiClient, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { mockedApiClient: { post: vi.fn(), get: vi.fn() }, ApiErrorMock };
});

// نحاكي عميل الـ API — هذه اختبارات وحدة لمنطق الخدمة وليست للشبكة.
vi.mock("@/lib/api/api-client", () => ({
  apiClient: mockedApiClient,
  ApiError: ApiErrorMock,
}));

// The canonical service now delegates login/MFA to the typed OpenAPI
// boundary. Keep these unit tests transport-free while preserving their
// existing payload assertions through the shared mock transport.
vi.mock("@/services/api/contracts-auth-service", () => ({
  contractLogin: (payload: unknown) => mockedApiClient.post("/api/v1/auth/login", payload)
    .then((data: unknown) => ({ data, error: undefined, response: { ok: true } })),
  contractVerifyMfa: (payload: unknown) => mockedApiClient.post("/api/v1/auth/mfa/verify", payload)
    .then((data: unknown) => ({ data, error: undefined, response: { ok: true } })),
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

    const result = await login({ email: "student@thanawy.com", password: "secret" });

    expect(result).toEqual({ status: "success", success: true, requiresMfa: false, challengeId: null });
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("trims the email before sending", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ email: "  student@thanawy.com  ", password: "secret" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toMatchObject({ email: "student@thanawy.com" });
  });

  it("sends the single canonical email field (no legacy identifier alias)", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ email: "student@thanawy.com", password: "secret" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("email", "student@thanawy.com");
    expect(payload).not.toHaveProperty("identifier");
  });

  it("omits fingerprint when not provided", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ email: "a@b.com", password: "x" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).not.toHaveProperty("fingerprint");
  });

  it("includes fingerprint when provided", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ email: "a@b.com", password: "x", fingerprint: "fp-123" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("fingerprint", "fp-123");
  });

  it("defaults rememberMe to false", async () => {
    mockedPost.mockResolvedValueOnce({});

    await login({ email: "a@b.com", password: "x" });

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("rememberMe", false);
  });

  it("rejects an invalid email locally without calling the API", async () => {
    const result = await login({ email: "not-an-email", password: "x" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("بيانات الدخول غير صالحة");
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("reports requiresMfa with the challengeId", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true, challengeId: "challenge-abc" });

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result).toEqual({
      status: "mfa_required",
      success: false,
      requiresMfa: true,
      challengeId: "challenge-abc",
    });
  });

  it("surfaces an error when mfaRequired is set but the challengeId is missing", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true });

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(false);
    expect(result.requiresMfa).toBe(false);
    expect(result.error).toBe("استجابة غير متوقعة من الخادم");
  });

  it("no longer reads the legacy userId or ticket spelling for the challenge", async () => {
    mockedPost.mockResolvedValueOnce({ mfaRequired: true, userId: "legacy-handle" });

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(false);
    expect(result.challengeId).toBeNull();
  });

  it("never throws — returns the ApiError message", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("بيانات الدخول غير صحيحة", 401));

    const result = await login({ email: "a@b.com", password: "wrong" });

    expect(result.success).toBe(false);
    expect(result.requiresMfa).toBe(false);
    expect(result.error).toBe("بيانات الدخول غير صحيحة");
  });

  it("uses the fallback message for non-Error failures", async () => {
    mockedPost.mockRejectedValueOnce("network glitch");

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.error).toBe("فشل تسجيل الدخول");
  });

  it("marks non-throttled failures explicitly so no 429 verdict is silently dropped", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("بيانات الدخول غير صحيحة", 401));

    const result = await login({ email: "a@b.com", password: "wrong" });

    expect(result).toMatchObject({ success: false, rateLimited: false, retryAfterMs: null });
  });

  it("translates ACCOUNT_LOCKED with a wait suffix into a friendly message and retryAfterMs", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("ACCOUNT_LOCKED:895", 423));

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(false);
    expect(result.retryAfterMs).toBe(895000);
    expect(result.error).toContain("تم إغلاق الحساب مؤقتًا");
    expect(result.error).toContain("بعد");
  });

  it("handles ACCOUNT_LOCKED without a suffix", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("ACCOUNT_LOCKED", 423));

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(false);
    expect(result.retryAfterMs).toBeNull();
    expect(result.error).toContain("تم إغلاق الحساب مؤقتًا");
  });

  it("flags unverified-email rejections with needsVerification", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("EMAIL_NOT_VERIFIED", 403));

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(false);
    expect(result.needsVerification).toBe(true);
    expect(result.error).toContain("غير مفعّل");
  });

  it("flags Arabic unverified-account messages too", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("الحساب غير مفعّل", 403));

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.needsVerification).toBe(true);
  });

  it("does not flag generic invalid-credentials as unverified", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("invalid email or password", 401));

    const result = await login({ email: "a@b.com", password: "x" });

    expect(result.needsVerification).not.toBe(true);
    expect(result.error).toBe("invalid email or password");
  });
});
describe("verifyMfa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds when the backend accepts the code", async () => {
    mockedPost.mockResolvedValueOnce({});

    const result = await verifyMfa("challenge-1", "123456");

    expect(result.success).toBe(true);
    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toMatchObject({ challengeId: "challenge-1", code: "123456" });
  });

  it("sends only the canonical challengeId (no legacy ticket or userId alias)", async () => {
    mockedPost.mockResolvedValueOnce({});

    await verifyMfa("challenge-1", "123456");

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("challengeId", "challenge-1");
    expect(payload).not.toHaveProperty("ticket");
    expect(payload).not.toHaveProperty("userId");
  });

  it("trims the code before sending", async () => {
    mockedPost.mockResolvedValueOnce({});

    await verifyMfa("challenge-1", "  123456  ");

    const [, payload] = mockedPost.mock.calls[0]!;
    expect(payload).toHaveProperty("code", "123456");
  });

  it("rejects an empty challenge locally without calling the API", async () => {
    const result = await verifyMfa("", "123456");

    expect(result.success).toBe(false);
    expect(result.error).toBe("بيانات التحقق غير صالحة");
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("rejects malformed MFA codes locally", async () => {
    const result = await verifyMfa("challenge-1", "12345");

    expect(result.success).toBe(false);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("accepts recovery codes", async () => {
    mockedPost.mockResolvedValueOnce({});

    const result = await verifyMfa("challenge-1", "ABCD-1234");

    expect(result.success).toBe(true);
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("keeps the challengeId and surfaces the error on failure", async () => {
    mockedPost.mockRejectedValueOnce(new ApiError("رمز غير صالح", 400));

    const result = await verifyMfa("challenge-1", "000000");

    expect(result.success).toBe(false);
    expect(result.challengeId).toBe("challenge-1");
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
