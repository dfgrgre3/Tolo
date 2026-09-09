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

  it("does not classify every write as idempotent", () => {
    expect(requiresIdempotencyKey("POST", "/api/auth/login")).toBe(false);
    expect(requiresIdempotencyKey("POST", "/api/analytics/events")).toBe(false);
    expect(requiresIdempotencyKey("POST", "/api/upload/chunked")).toBe(false);
    expect(requiresIdempotencyKey("GET", "/api/payments/history")).toBe(false);
  });
});
