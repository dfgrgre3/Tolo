import { describe, expect, it } from "vitest";
import { requiresIdempotencyKey } from "@/lib/api/idempotency-policy";

describe("requiresIdempotencyKey", () => {
  it("requires keys for replay-safe payment and order writes", () => {
    expect(requiresIdempotencyKey("POST", "/api/payments/charge")).toBe(true);
    expect(requiresIdempotencyKey("PATCH", "/api/orders/123")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/courses/course-1/enroll")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/cart/checkout")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/subscriptions/purchase")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/billing/wallet")).toBe(true);
  });

  it("requires keys for player progress + question attempts (replay-safe by contract)", () => {
    expect(requiresIdempotencyKey("POST", "/api/courses/lessons/lesson-1/progress")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/courses/lessons/lesson-1/questions/q-1/answer")).toBe(true);
    expect(requiresIdempotencyKey("POST", "/api/courses/lessons/lesson-1/interactive-questions/q-1/answer")).toBe(true);
  });

  it("requires keys for per-note mutations (clientOpId dedupe)", () => {
    expect(requiresIdempotencyKey("POST", "/api/courses/lessons/lesson-1/notes/items")).toBe(true);
    expect(requiresIdempotencyKey("PATCH", "/api/courses/lessons/lesson-1/notes/items/n-1")).toBe(true);
    expect(requiresIdempotencyKey("DELETE", "/api/courses/lessons/lesson-1/notes/items/n-1")).toBe(true);
  });

  it("does not classify every write as idempotent", () => {
    expect(requiresIdempotencyKey("POST", "/api/v1/auth/login")).toBe(false);
    expect(requiresIdempotencyKey("POST", "/api/analytics/events")).toBe(false);
    expect(requiresIdempotencyKey("POST", "/api/upload/chunked")).toBe(false);
    expect(requiresIdempotencyKey("GET", "/api/payments/history")).toBe(false);
  });
});
