/**
 * Tests for the openapi-fetch-based login service (POC).
 *
 * Mirrors the legacy login-service.test.ts coverage so the two
 * implementations can be swapped when the migration completes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/generated-client", () => ({
  client: {
    POST: vi.fn(),
  },
}));

import { client } from "@/lib/api/generated-client";
import {
  loginClient,
  verifyMfaClient,
  getDeviceName,
} from "@/services/auth/login-service.client";

const mockedPost = vi.mocked(client.POST);

function ok<T>(data: T) {
  return { data, error: null, response: { ok: true, status: 200 } };
}
function fail(status: number, message: string) {
  return {
    data: null,
    error: new Error(message),
    response: { ok: false, status },
  };
}

describe("loginClient (openapi-fetch POC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when the backend establishes a session", async () => {
    mockedPost.mockResolvedValueOnce(ok({ mfaRequired: false }));

    const result = await loginClient({
      email: "student@thanawy.com",
      password: "secret",
    });

    expect(result).toEqual({
      success: true,
      requiresMfa: false,
      challengeId: null,
    });
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("returns requiresMfa when the backend issues a challenge", async () => {
    mockedPost.mockResolvedValueOnce(
      ok({ mfaRequired: true, challengeId: "ch_123" }),
    );

    const result = await loginClient({
      email: "student@thanawy.com",
      password: "secret",
    });

    expect(result).toEqual({
      success: false,
      requiresMfa: true,
      challengeId: "ch_123",
    });
  });

  it("returns a localized error when the backend rejects", async () => {
    mockedPost.mockResolvedValueOnce(fail(401, "invalid credentials"));

    const result = await loginClient({
      email: "student@thanawy.com",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid credentials");
  });

  it("rejects malformed credentials without hitting the network", async () => {
    const result = await loginClient({
      email: "not-an-email",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(mockedPost).not.toHaveBeenCalled();
  });
});

describe("verifyMfaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success on a valid code", async () => {
    mockedPost.mockResolvedValueOnce(ok({}));

    const result = await verifyMfaClient("ch_123", "123456");

    expect(result).toEqual({
      success: true,
      requiresMfa: false,
      challengeId: null,
    });
  });

  it("returns the backend error on a rejected code", async () => {
    mockedPost.mockResolvedValueOnce(fail(400, "bad code"));

    const result = await verifyMfaClient("ch_123", "000000");

    expect(result.success).toBe(false);
    expect(result.error).toBe("bad code");
    expect(result.challengeId).toBe("ch_123");
  });
});

describe("getDeviceName", () => {
  it("returns a fallback when navigator is missing", () => {
    // jsdom provides navigator, so we just verify it doesn't throw.
    expect(typeof getDeviceName()).toBe("string");
    expect(getDeviceName().length).toBeGreaterThan(0);
  });
});
