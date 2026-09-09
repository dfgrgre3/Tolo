import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/csrf", () => ({
  applyCsrfHeader: vi.fn(async () => undefined),
  ensureCsrfToken: vi.fn(async () => undefined),
  isCsrfValidationFailure: vi.fn(async () => false),
}));

import { apiClient } from "@/lib/api/api-client";

describe("idempotent write retries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "retry-key-1") });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reuses one Idempotency-Key when a protected write is retried", async () => {
    const keys: string[] = [];
    let attempts = 0;

    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
      attempts += 1;

      if (attempts === 1) {
        return new Response("gateway timeout", { status: 504 });
      }

      return new Response(JSON.stringify({ success: true, data: { enrolled: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    const resultPromise = apiClient.postJson<{ enrolled: boolean }>(
      "/api/courses/course-1/enroll",
      {},
      { retries: 1 },
    );

    await vi.advanceTimersByTimeAsync(1100);

    await expect(resultPromise).resolves.toEqual({ enrolled: true });
    expect(attempts).toBe(2);
    expect(keys[0]).toBe("retry-key-1");
    expect(keys[1]).toBe(keys[0]);
  });
});
