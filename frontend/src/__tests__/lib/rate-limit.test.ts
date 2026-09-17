import { describe, it, expect, beforeEach } from "vitest";
import {
  readRetryAfterMs,
  parseRetryAfterHeader,
  parseApiRateLimit,
  parseContractRateLimit,
  readCooldownMs,
  setCooldown,
  getCooldownRemaining,
  clearCooldown,
  formatCooldownAr,
} from "@/lib/auth/rate-limit";

describe("readRetryAfterMs", () => {
  it("reads every plausible server spelling", () => {
    expect(readRetryAfterMs({ retryAfterMs: 5000 })).toBe(5000);
    expect(readRetryAfterMs({ retry_after_ms: 5000 })).toBe(5000);
    expect(readRetryAfterMs({ cooldownMs: 30_000 })).toBe(30_000);
    expect(readRetryAfterMs({ retryAfter: 45 })).toBe(45_000);
    expect(readRetryAfterMs({ retry_after: 45 })).toBe(45_000);
    expect(readRetryAfterMs({ retryAfterSeconds: 10 })).toBe(10_000);
    expect(readRetryAfterMs({ cooldown: 120 })).toBe(120_000);
    expect(readRetryAfterMs({ resendAfter: 60 })).toBe(60_000);
  });

  it("rejects garbage (never a NaN/Infinity countdown)", () => {
    expect(readRetryAfterMs(null)).toBeNull();
    expect(readRetryAfterMs("60")).toBeNull();
    expect(readRetryAfterMs({})).toBeNull();
    expect(readRetryAfterMs({ retryAfter: -5 })).toBeNull();
    expect(readRetryAfterMs({ retryAfter: 0 })).toBeNull();
    expect(readRetryAfterMs({ retryAfterMs: Number.NaN })).toBeNull();
    expect(readRetryAfterMs({ retryAfterMs: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("caps absurd waits at 24h", () => {
    expect(readRetryAfterMs({ retryAfter: 10 ** 9 })).toBe(24 * 60 * 60 * 1000);
  });
});

describe("parseRetryAfterHeader", () => {
  it("parses delay-seconds", () => {
    expect(parseRetryAfterHeader("120")).toBe(120_000);
    expect(parseRetryAfterHeader("0")).toBe(0);
  });

  it("parses HTTP-dates", () => {
    const future = new Date(Date.now() + 30_000).toUTCString();
    const ms = parseRetryAfterHeader(future);
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(0);
    expect(ms!).toBeLessThanOrEqual(30_000);
  });

  it("rejects absent/garbage values", () => {
    expect(parseRetryAfterHeader(null)).toBeNull();
    expect(parseRetryAfterHeader(undefined)).toBeNull();
    expect(parseRetryAfterHeader("")).toBeNull();
    expect(parseRetryAfterHeader("soon-ish")).toBeNull();
  });
});

describe("parseApiRateLimit", () => {
  it("flags 429 with the body-directed wait", () => {
    const err = { status: 429, data: { retryAfter: 30 } };
    expect(parseApiRateLimit(err)).toEqual({ rateLimited: true, retryAfterMs: 30_000 });
  });

  it("flags 429 without a wait as throttled-but-unstated", () => {
    expect(parseApiRateLimit({ status: 429, data: {} })).toEqual({
      rateLimited: true,
      retryAfterMs: null,
    });
  });

  it("never mistakes other statuses for throttling", () => {
    expect(parseApiRateLimit({ status: 401, data: { retryAfter: 30 } })).toEqual({
      rateLimited: false,
      retryAfterMs: null,
    });
    expect(parseApiRateLimit(new Error("boom"))).toEqual({
      rateLimited: false,
      retryAfterMs: null,
    });
    expect(parseApiRateLimit(null)).toEqual({ rateLimited: false, retryAfterMs: null });
  });
});

describe("parseContractRateLimit", () => {
  const headersOf = (retryAfter: string | null) => ({
    get: (name: string) => (name === "retry-after" ? retryAfter : null),
  });

  it("prefers the Retry-After header on 429", () => {
    expect(
      parseContractRateLimit({
        response: { status: 429, headers: headersOf("90") },
        error: { retryAfter: 5 },
      })
    ).toEqual({ rateLimited: true, retryAfterMs: 90_000 });
  });

  it("falls back to the error body when the header is absent", () => {
    expect(
      parseContractRateLimit({
        response: { status: 429, headers: headersOf(null) },
        error: { cooldownMs: 15_000 },
      })
    ).toEqual({ rateLimited: true, retryAfterMs: 15_000 });
  });

  it("ignores non-429 responses even with retry-looking bodies", () => {
    expect(
      parseContractRateLimit({
        response: { status: 400, headers: headersOf("90") },
        error: {},
      })
    ).toEqual({ rateLimited: false, retryAfterMs: null });
    // Mocks without status/headers (unit-test doubles) are never throttled.
    expect(parseContractRateLimit({ response: { ok: true } as never })).toEqual({
      rateLimited: false,
      retryAfterMs: null,
    });
  });
});

describe("readCooldownMs", () => {
  it("reads server-directed resend delays from success bodies", () => {
    expect(readCooldownMs({ cooldownMs: 45_000 })).toBe(45_000);
    expect(readCooldownMs({ message: "sent" })).toBeNull();
    expect(readCooldownMs(null)).toBeNull();
  });
});

describe("cooldown store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts at zero, counts down, and expires", () => {
    expect(getCooldownRemaining("k")).toBe(0);
    setCooldown("k", 60_000);
    const remaining = getCooldownRemaining("k");
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60_000);
  });

  it("survives re-reads (the reload fix) and only extends when longer", () => {
    setCooldown("k", 60_000);
    const first = getCooldownRemaining("k");
    setCooldown("k", 1000); // shorter must not shrink the deadline
    expect(getCooldownRemaining("k")).toBeGreaterThanOrEqual(first - 5);
    clearCooldown("k");
    expect(getCooldownRemaining("k")).toBe(0);
  });

  it("ignores empty keys and non-positive waits", () => {
    setCooldown("", 60_000);
    setCooldown("k", 0);
    setCooldown("k", -100);
    expect(getCooldownRemaining("")).toBe(0);
    expect(getCooldownRemaining("k")).toBe(0);
  });
});

describe("formatCooldownAr", () => {
  it("formats seconds with Arabic plurals", () => {
    expect(formatCooldownAr(1000)).toBe("بعد ثانية");
    expect(formatCooldownAr(2000)).toBe("بعد ثانيتين");
    expect(formatCooldownAr(5000)).toBe("بعد 5 ثوانٍ");
    expect(formatCooldownAr(45_000)).toBe("بعد 45 ثانية");
  });

  it("formats minutes and hours", () => {
    expect(formatCooldownAr(60_000)).toBe("بعد دقيقة");
    expect(formatCooldownAr(120_000)).toBe("بعد دقيقتين");
    expect(formatCooldownAr(180_000)).toBe("بعد 3 دقائق");
    expect(formatCooldownAr(45 * 60_000)).toBe("بعد 45 دقيقة");
    expect(formatCooldownAr(60 * 60_000)).toBe("بعد ساعة");
    expect(formatCooldownAr(2 * 60 * 60_000)).toBe("بعد ساعتين");
  });
});
