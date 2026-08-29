import { describe, it, expect } from "vitest";
import {
  RETRYABLE_STATUSES,
  RETRYABLE_METHODS,
  RETRY_DELAY,
  canRetryMethod,
  isRetryableError,
} from "@/lib/api/retry-policy";

/**
 * سياسة إعادة المحاولة — 503/500 يجب ألا تُعاد أبداً (thundering herd).
 */
describe("retry constants", () => {
  it("only retries transient statuses", () => {
    expect(RETRYABLE_STATUSES).toEqual([408, 429, 502, 504]);
  });

  it("never retries 500 or 503", () => {
    expect(RETRYABLE_STATUSES).not.toContain(500);
    expect(RETRYABLE_STATUSES).not.toContain(503);
  });

  it("excludes POST from retryable methods (not idempotent)", () => {
    expect(RETRYABLE_METHODS).not.toContain("POST");
    expect(RETRYABLE_METHODS).toContain("GET");
    expect(RETRYABLE_METHODS).toContain("PUT");
    expect(RETRYABLE_METHODS).toContain("DELETE");
  });
});

describe("canRetryMethod", () => {
  it("is case-insensitive", () => {
    expect(canRetryMethod("get")).toBe(true);
    expect(canRetryMethod("GET")).toBe(true);
    expect(canRetryMethod("get ")).toBe(false);
  });

  it("rejects non-idempotent methods", () => {
    expect(canRetryMethod("POST")).toBe(false);
    expect(canRetryMethod("PATCH")).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("retries AbortError (timeout) for idempotent methods within budget", () => {
    expect(isRetryableError({ name: "AbortError" }, 0, 3, "GET")).toBe(true);
  });

  it("retries fetch network failures", () => {
    expect(isRetryableError({ name: "TypeError", message: "fetch failed" }, 1, 3, "GET")).toBe(true);
  });

  it("never retries POST regardless of the error", () => {
    expect(isRetryableError({ name: "AbortError" }, 0, 3, "POST")).toBe(false);
  });

  it("stops once the retry budget is exhausted", () => {
    expect(isRetryableError({ name: "AbortError" }, 3, 3, "GET")).toBe(false);
    expect(isRetryableError({ name: "AbortError" }, 2, 3, "GET")).toBe(true);
  });

  it("does not retry unrelated errors", () => {
    expect(isRetryableError({ name: "SyntaxError", message: "bad json" }, 0, 3, "GET")).toBe(false);
    expect(isRetryableError(null, 0, 3, "GET")).toBe(false);
  });
});

describe("RETRY_DELAY", () => {
  it("waits 1s base between attempts", () => {
    expect(RETRY_DELAY).toBe(1000);
  });
});
