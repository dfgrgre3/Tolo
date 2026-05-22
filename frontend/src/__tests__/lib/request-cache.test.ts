import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestCache } from "@/lib/api/request-cache";

describe("RequestCacheManager", () => {
  beforeEach(() => {
    requestCache.clear();
  });

  it("should collapse/deduplicate concurrent identical GET requests", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ success: true, count: callCount }));
    });

    // Fire concurrent requests at the exact same time
    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/courses", undefined, fetcher),
      requestCache.getResponse("/api/courses", undefined, fetcher),
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Verify fetcher was only invoked ONCE
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(callCount).toBe(1);
    
    // Both responses should contain identical data
    expect(data1).toEqual({ success: true, count: 1 });
    expect(data2).toEqual({ success: true, count: 1 });
  });

  it("should cache successful requests and return them within TTL", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ success: true, count: callCount }));
    });

    // First request (Cache Miss)
    const res1 = await requestCache.getResponse("/api/courses", undefined, fetcher);
    const data1 = await res1.json();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data1.count).toBe(1);

    // Second request within TTL (Cache Hit)
    const res2 = await requestCache.getResponse("/api/courses", undefined, fetcher);
    const data2 = await res2.json();

    // Fetcher should NOT be called again
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data2.count).toBe(1);
  });

  it("should bypass cache when force=true or Cache-Control: no-cache headers are set", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ success: true, count: callCount }));
    });

    // First request (Cache Miss)
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second request with force=true (Cache Bypass)
    const res2 = await requestCache.getResponse("/api/courses?force=true", undefined, fetcher);
    const data2 = await res2.json();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(data2.count).toBe(2);

    // Third request with Cache-Control header (Cache Bypass)
    const headers = new Headers();
    headers.set("Cache-Control", "no-cache");
    const res3 = await requestCache.getResponse("/api/courses", { headers, method: "GET" }, fetcher);
    const data3 = await res3.json();

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(data3.count).toBe(3);
  });
});
