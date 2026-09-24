import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isSameOriginRequest } from "@/lib/security/origin-check";

// vitest runs with NODE_ENV=test, so the development loopback normalization
// in origin-check.ts is active in every case below.

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/analytics/mega-menu", {
    method: "POST",
    headers,
  });
}

describe("isSameOriginRequest", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3000";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_ENV;
  });

  it("accepts a loopback origin that differs only in hostname spelling (dev)", () => {
    const req = makeRequest({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(req)).toBe(true);
  });

  it("accepts an exact origin match against the configured base URL", () => {
    const req = makeRequest({
      origin: "http://127.0.0.1:3000",
      host: "127.0.0.1:3000",
    });
    expect(isSameOriginRequest(req)).toBe(true);
  });

  it("rejects when the port differs", () => {
    const req = makeRequest({
      origin: "http://localhost:3001",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("rejects a cross-site origin", () => {
    const req = makeRequest({
      origin: "https://evil.example.com",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("rejects when neither Origin nor Referer is present", () => {
    const req = makeRequest({ host: "localhost:3000" });
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("falls back to Referer when Origin is absent", () => {
    const req = makeRequest({
      referer: "http://localhost:3000/some/page",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(req)).toBe(true);
  });
});
