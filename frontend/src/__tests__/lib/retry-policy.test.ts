import { describe, it, expect } from "vitest";
import {
  RETRYABLE_STATUSES,
  RETRYABLE_METHODS,
  RETRY_DELAY,
  canRetryMethod,
  isRetryableError,
  classifyFetchError,
  TimeoutError,
  CallerAbortError,
  NetworkError,
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
    expect(RETRYABLE_METHODS).not.toContain("PATCH");
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

describe("error class taxonomy", () => {
  it("TimeoutError carries the TimeoutError name for diagnostics", () => {
    const err = new TimeoutError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err.name).toBe("TimeoutError");
    expect(err.message).toBe("Request timed out");
  });

  it("CallerAbortError carries the CallerAbortError name and is distinguishable", () => {
    const err = new CallerAbortError();
    expect(err).toBeInstanceOf(CallerAbortError);
    expect(err.name).toBe("CallerAbortError");
    // Caller aborts must NOT be mistaken for timeouts/network errors.
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect(err).not.toBeInstanceOf(NetworkError);
  });

  it("NetworkError carries the NetworkError name and is distinguishable", () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.name).toBe("NetworkError");
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect(err).not.toBeInstanceOf(CallerAbortError);
  });

  it("TimeoutError and CallerAbortError are distinct classes (regression)", () => {
    // Earlier this codebase treated all aborts as `name === 'AbortError'`,
    // which made caller aborts and internal timeouts indistinguishable and
    // caused caller aborts to be retried. The two must be separate classes.
    expect(new TimeoutError()).not.toBeInstanceOf(CallerAbortError);
    expect(new CallerAbortError()).not.toBeInstanceOf(TimeoutError);
  });
});

describe("classifyFetchError", () => {
  it("passes through already-classified errors unchanged", () => {
    const t = new TimeoutError();
    expect(classifyFetchError(t)).toBe(t);

    const c = new CallerAbortError();
    expect(classifyFetchError(c)).toBe(c);

    const n = new NetworkError();
    expect(classifyFetchError(n)).toBe(n);
  });

  it("wraps a generic TypeError as NetworkError", () => {
    // Browsers reject failed fetches with `TypeError: Failed to fetch` —
    // there is no explicit network error class, so we wrap.
    const classified = classifyFetchError(new TypeError("Failed to fetch"));
    expect(classified).toBeInstanceOf(NetworkError);
    expect(classified.message).toBe("Failed to fetch");
  });

  it("passes through unknown Error instances", () => {
    const e = new Error("weird");
    expect(classifyFetchError(e)).toBe(e);
  });

  it("coerces non-Error throwables to a stringified Error", () => {
    const classified = classifyFetchError("boom");
    expect(classified).toBeInstanceOf(Error);
    expect(classified.message).toBe("boom");
  });
});

describe("isRetryableError", () => {
  it("retries TimeoutError for idempotent methods within budget", () => {
    expect(isRetryableError(new TimeoutError(), 0, 3, "GET")).toBe(true);
  });

  it("retries NetworkError for idempotent methods within budget", () => {
    expect(isRetryableError(new NetworkError(), 0, 3, "GET")).toBe(true);
  });

  it("retries a generic TypeError (browser 'Failed to fetch') for idempotent methods", () => {
    expect(isRetryableError(new TypeError("Failed to fetch"), 1, 3, "GET")).toBe(true);
  });

  it("NEVER retries a caller-cancelled request (the previous bug)", () => {
    // The old code retried every AbortError, including unmount-time aborts.
    // The new code must terminate caller-initiated cancellations
    // immediately for every method — even idempotent ones.
    expect(isRetryableError(new CallerAbortError(), 0, 3, "GET")).toBe(false);
    expect(isRetryableError(new CallerAbortError(), 0, 3, "PUT")).toBe(false);
    expect(isRetryableError(new CallerAbortError(), 0, 3, "DELETE")).toBe(false);
  });

  it("never retries POST regardless of the error", () => {
    expect(isRetryableError(new TimeoutError(), 0, 3, "POST")).toBe(false);
    expect(isRetryableError(new NetworkError(), 0, 3, "POST")).toBe(false);
  });

  it("never retries PATCH regardless of the error", () => {
    expect(isRetryableError(new TimeoutError(), 0, 3, "PATCH")).toBe(false);
    expect(isRetryableError(new NetworkError(), 0, 3, "PATCH")).toBe(false);
  });

  it("stops once the retry budget is exhausted", () => {
    expect(isRetryableError(new TimeoutError(), 3, 3, "GET")).toBe(false);
    expect(isRetryableError(new TimeoutError(), 2, 3, "GET")).toBe(true);
  });

  it("does not retry unrelated errors", () => {
    expect(isRetryableError(new SyntaxError("bad json"), 0, 3, "GET")).toBe(false);
    expect(isRetryableError(null, 0, 3, "GET")).toBe(false);
    expect(isRetryableError("string error", 0, 3, "GET")).toBe(false);
  });
});

describe("RETRY_DELAY", () => {
  it("waits 1s base between attempts", () => {
    expect(RETRY_DELAY).toBe(1000);
  });
});