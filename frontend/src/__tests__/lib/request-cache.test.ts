import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestCache } from "@/lib/api/request-cache";

describe("RequestCacheManager", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
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

describe("RequestCacheManager identity scoping", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  it("should NOT serve a user-scoped response cached under a different identity", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ owner: `call-${fetcher.mock.calls.length}` }));
    });

    // Cached as user-a
    await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Identity switches in-session (e.g. another user logs in without a reload)
    requestCache.setIdentity("user-b");
    const res = await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    const data = await res.json();

    // Must hit the network again — user-a's cached entry is unreachable
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(data.owner).toBe("call-2");
  });

  it("should evict user-scoped entries when the identity changes", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/progress/summary", undefined, fetcher);
    await requestCache.getResponse("/api/gamification/progress", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Switching back to user-a must NOT resurrect the evicted entries
    requestCache.setIdentity("user-b");
    requestCache.setIdentity("user-a");
    await requestCache.getResponse("/api/progress/summary", undefined, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("should keep serving user-scoped responses while the identity is unchanged", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    requestCache.setIdentity("user-a"); // same identity — no eviction
    await requestCache.getResponse("/api/my-courses", undefined, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should keep serving PUBLIC routes across identity changes (no refetch)", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/courses", undefined, fetcher);

    requestCache.setIdentity("user-b");
    await requestCache.getResponse("/api/courses", undefined, fetcher);

    // Public content does not depend on identity — the cached entry stays valid
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should serve user-scoped data cached during the 'unknown identity' phase only while identity stays unknown", async () => {
    // Boot phase: /auth/me has not resolved yet (identity "")
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));
    await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // /auth/me resolves — the boot-phase entry must no longer be reachable
    requestCache.setIdentity("user-a");
    await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should deduplicate concurrent user-scoped requests under the same identity only", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/gamification/progress", undefined, fetcher),
      requestCache.getResponse("/api/gamification/progress", undefined, fetcher),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Same URL, different identity → separate in-flight/cache namespace
    requestCache.setIdentity("user-b");
    await requestCache.getResponse("/api/gamification/progress", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("RequestCacheManager TTL matching", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should apply the LONGEST matching route TTL (/api/settings/preferences not shadowed by /api/settings)", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/settings/preferences", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 5.5 minutes: past the /api/settings TTL (5 min), within /api/settings/preferences (10 min)
    vi.advanceTimersByTime(330_000);
    await requestCache.getResponse("/api/settings/preferences", undefined, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
