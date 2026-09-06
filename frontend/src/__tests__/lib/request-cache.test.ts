import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestCache } from "@/lib/api/request-cache";

describe("RequestCacheManager deduplication (in-flight only)", () => {
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

  it("should NOT cache sequential requests — each call hits the network", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ success: true, count: callCount }));
    });

    // First request
    const res1 = await requestCache.getResponse("/api/courses", undefined, fetcher);
    const data1 = await res1.json();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data1.count).toBe(1);

    // Second sequential request — must hit the network (TanStack Query
    // owns the cache; RequestCacheManager only deduplicates concurrent
    // requests).
    const res2 = await requestCache.getResponse("/api/courses", undefined, fetcher);
    const data2 = await res2.json();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(data2.count).toBe(2);
  });

  it("should bypass dedup when force=true or Cache-Control: no-cache headers are set", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ success: true, count: callCount }));
    });

    // First request (no dedup key — non-cacheable policy → passes through)
    await requestCache.getResponse("/api/auth/me", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // force=true bypasses dedup (caller wants fresh data)
    const res2 = await requestCache.getResponse("/api/courses?force=true", undefined, fetcher);
    const data2 = await res2.json();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(data2.count).toBe(2);

    // Cache-Control: no-cache also bypasses dedup
    const headers = new Headers();
    headers.set("Cache-Control", "no-cache");
    await requestCache.getResponse(
      "/api/courses",
      { headers, method: "GET" },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe("RequestCacheManager identity scoping", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  it("should NOT coalesce an in-flight user-scoped request across identities", async () => {
    // An in-flight promise for user-a must NOT be replayed for user-b:
    // they are different cache keys, so each call fetches.
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ owner: `call-${fetcher.mock.calls.length}` }),
      );
    });

    await requestCache.getResponse("/api/my-courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Identity switches in-session (e.g. another user logs in without a reload)
    requestCache.setIdentity("user-b");
    const res = await requestCache.getResponse(
      "/api/my-courses",
      undefined,
      fetcher,
    );
    const data = await res.json();

    // Must hit the network again — user-a's in-flight entry is dropped
    // when the identity changes (no in-flight or cached promise survives
    // a switch).
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(data.owner).toBe("call-2");
  });

  it("should drop in-flight user-scoped entries when the identity changes", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/progress/summary", undefined, fetcher);
    await requestCache.getResponse("/api/gamification/progress", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Switching identities must not preserve in-flight user-scoped state
    requestCache.setIdentity("user-b");
    requestCache.setIdentity("user-a");
    await requestCache.getResponse(
      "/api/progress/summary",
      undefined,
      fetcher,
    );

    // Each request now hits the network (no carry-over state from the
    // earlier identity)
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("should keep coalescing concurrent user-scoped requests while the identity is unchanged", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/my-courses", undefined, fetcher),
      requestCache.getResponse("/api/my-courses", undefined, fetcher),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should keep coalescing PUBLIC routes across identity changes", async () => {
    // Public content does not depend on identity — the in-flight key
    // does not include the user scope, so a fresh request still hits
    // the network (no cache) but a concurrent pair under either identity
    // would still coalesce.
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/courses", undefined, fetcher),
      requestCache.getResponse("/api/courses", undefined, fetcher),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    requestCache.setIdentity("user-b");
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    // Sequential — no cache, so it refetches
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should deduplicate concurrent user-scoped requests under the same identity only", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const [res1, res2] = await Promise.all([
      requestCache.getResponse(
        "/api/gamification/progress",
        undefined,
        fetcher,
      ),
      requestCache.getResponse(
        "/api/gamification/progress",
        undefined,
        fetcher,
      ),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Same URL, different identity → separate in-flight namespace, so
    // the next request fires a new network call (no in-flight promise
    // left from user-a).
    requestCache.setIdentity("user-b");
    await requestCache.getResponse(
      "/api/gamification/progress",
      undefined,
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("RequestCacheManager fail-closed policy matching", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  it("should not coalesce across identities via prefix shadowing (/api/settings/preferences vs /api/settings)", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse(
      "/api/settings/preferences",
      undefined,
      fetcher,
    );
    // Sequential — no in-flight promise left → new network call
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should never deduplicate endpoints marked with scope: none or ttl: 0 (/api/auth/me)", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ user: { id: "u1" } })),
      );

    await requestCache.getResponse("/api/auth/me", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await requestCache.getResponse("/api/auth/me", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);

    const policy = requestCache.getPolicy("/api/auth/me");
    expect(policy.scope).toBe("none");
    expect(policy.ttl).toBe(0);
  });
});

describe("RequestCacheManager secure defaults & server cache directives", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  it("should FAIL CLOSED: undeclared endpoints default to scope none (never deduplicated)", async () => {
    const policy = requestCache.getPolicy("/api/dashboard/private-data");
    expect(policy.scope).toBe("none");
    expect(policy.ttl).toBe(0);

    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const [res1, res2] = await Promise.all([
      requestCache.getResponse(
        "/api/dashboard/private-data",
        undefined,
        fetcher,
      ),
      requestCache.getResponse(
        "/api/dashboard/private-data",
        undefined,
        fetcher,
      ),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    // Scope none → no in-flight key → both calls fire
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should not let a prefix sibling match a declared policy (/api/courses-v2)", async () => {
    const policy = requestCache.getPolicy("/api/courses-v2/private");
    expect(policy.scope).toBe("none");
    expect(policy.ttl).toBe(0);
  });

  it("should match wildcard enrollment-status only as a single middle segment", async () => {
    const ok = requestCache.getPolicy("/api/courses/123/enrollment-status");
    expect(ok.scope).toBe("user");
    expect(ok.ttl).toBe(60000);

    const unrelated = requestCache.getPolicy("/api/other/enrollment-status");
    expect(unrelated.scope).toBe("none");
  });

  it("should strip the query string before policy matching", async () => {
    const policy = requestCache.getPolicy("/api/courses?page=1");
    expect(policy.scope).toBe("public");
  });

  it("should NOT cache a response with Cache-Control: no-store (passes through)", async () => {
    // The dedup layer never stores full bodies, but a no-store response
    // must still hit the network on the next call (no replay). With
    // dedup-only semantics this is automatic — no extra logic needed.
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("{}", { headers: { "cache-control": "no-store" } }),
    );

    await requestCache.getResponse("/api/courses", undefined, fetcher);
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should NOT replay a response with Cache-Control: private", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("{}", {
        headers: { "cache-control": "private, max-age=60" },
      }),
    );

    await requestCache.getResponse("/api/courses", undefined, fetcher);
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should NOT replay a response that sets a cookie", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("{}", {
        headers: { "set-cookie": "access_token=abc; Path=/" },
      }),
    );

    await requestCache.getResponse("/api/courses", undefined, fetcher);
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should NOT replay a response whose Vary header keys on identity", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("{}", { headers: { vary: "Accept-Encoding, Authorization" } }),
    );

    await requestCache.getResponse("/api/courses", undefined, fetcher);
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should still coalesce concurrent requests when the server explicitly allows it (Cache-Control: public)", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("{}", { headers: { "cache-control": "public, max-age=60" } }),
    );

    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/courses", undefined, fetcher),
      requestCache.getResponse("/api/courses", undefined, fetcher),
    ]);
    await Promise.all([res1.json(), res2.json()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("RequestCacheManager deduplication contract", () => {
  beforeEach(() => {
    requestCache.clear();
    requestCache.setIdentity(null);
  });

  it("returns a real Response on every call so callers' `.json()` still works", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ value: 42 })),
    );

    const res1 = await requestCache.getResponse(
      "/api/courses",
      undefined,
      fetcher,
    );
    expect(res1).toBeInstanceOf(Response);

    // Each call returns a fresh Response (no body sharing across
    // sequential calls; only in-flight calls share via .clone()).
    const res2 = await requestCache.getResponse(
      "/api/courses",
      undefined,
      fetcher,
    );
    expect(res2).toBeInstanceOf(Response);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not coalesce 5xx error responses", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response("server error", { status: 500 }),
    );

    // Even concurrent error responses still coalesce on the in-flight
    // promise — the dedup gate is "is the key cacheable", not "is the
    // response successful". A 5xx is the fetcher's failure surface and
    // does not break the dedup contract.
    const [res1, res2] = await Promise.all([
      requestCache.getResponse("/api/courses", undefined, fetcher),
      requestCache.getResponse("/api/courses", undefined, fetcher),
    ]);
    await Promise.all([res1.text(), res2.text()]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // A subsequent request after the failure resolves is a new request
    // and fires again.
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not coalesce across users for user-scoped endpoints", async () => {
    requestCache.setIdentity("user-a");
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    const res1 = await requestCache.getResponse(
      "/api/my-courses",
      undefined,
      fetcher,
    );
    await res1.json();
    requestCache.setIdentity("user-b");
    const res2 = await requestCache.getResponse(
      "/api/my-courses",
      undefined,
      fetcher,
    );
    await res2.json();

    // Each user identity is a separate namespace → two network calls
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clear() drops in-flight promises so the next call refetches", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response("{}"));

    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    requestCache.clear();
    await requestCache.getResponse("/api/courses", undefined, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
