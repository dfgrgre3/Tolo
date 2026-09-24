import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ServerCache,
  CACHE_TTL,
  type RedisLike,
} from "@/lib/cache/server-cache";

// ─── Test doubles ───────────────────────────────────────────────────────────

/** In-memory Redis stand-in honouring PX expiries against the fake clock. */
class FakeRedis implements RedisLike {
  readonly store = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  private readonly expiries = new Map<string, number>();
  failNextOp = false;

  constructor(private readonly now: () => number) {}

  private alive(key: string): boolean {
    const deadline = this.expiries.get(key);
    if (deadline !== undefined && this.now() >= deadline) {
      this.store.delete(key);
      this.sets.delete(key);
      this.expiries.delete(key);
      return false;
    }
    return true;
  }

  private maybeFail(): void {
    if (this.failNextOp) {
      this.failNextOp = false;
      throw new Error("redis down");
    }
  }

  async get(key: string): Promise<string | null> {
    this.maybeFail();
    return this.alive(key) ? this.store.get(key) ?? null : null;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<unknown> {
    this.maybeFail();
    this.store.set(key, value);
    const pxIdx = args.indexOf("PX");
    if (pxIdx !== -1) {
      this.expiries.set(key, this.now() + Number(args[pxIdx + 1]));
    }
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    this.maybeFail();
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
      if (this.sets.delete(key)) removed += 1;
      this.expiries.delete(key);
    }
    return removed;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    this.maybeFail();
    let set = this.sets.get(key);
    if (!set) {
      set = new Set();
      this.sets.set(key, set);
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added += 1;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    this.maybeFail();
    if (!this.alive(key)) return [];
    return [...(this.sets.get(key) ?? [])];
  }

  async pexpire(key: string, ms: number): Promise<number> {
    this.maybeFail();
    this.expiries.set(key, this.now() + ms);
    return 1;
  }
}

let nowMs: number;
const advance = (ms: number) => {
  nowMs += ms;
};
const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

function makeCache(redis?: FakeRedis, options: { l1MaxEntries?: number } = {}) {
  nowMs = 1_000_000;
  const fake = redis ?? new FakeRedis(() => nowMs);
  const cache = new ServerCache({
    now: () => nowMs,
    redisClientFactory: async () => fake,
    l1MaxEntries: options.l1MaxEntries,
  });
  return { cache, redis: fake };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ServerCache", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("computes once on miss and serves subsequent reads from L1", async () => {
    const { cache, redis } = makeCache();
    const compute = vi.fn(async () => ({ id: 42 }));

    const first = await cache.getOrSet("user:42", compute);
    const second = await cache.getOrSet("user:42", compute);

    expect(first).toEqual({ id: 42 });
    expect(second).toEqual({ id: 42 });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.getMetrics().l1Hits).toBe(1);
    // Written through to L2 as well.
    expect(redis.store.has("tolo:cache:entry:user:42")).toBe(true);
  });

  it("coalesces concurrent misses onto a single compute (single-flight)", async () => {
    const { cache } = makeCache();
    let release!: (value: string) => void;
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });
    const compute = vi.fn(() => gate);

    const pending = Promise.all([
      cache.getOrSet("hot-key", compute),
      cache.getOrSet("hot-key", compute),
      cache.getOrSet("hot-key", compute),
    ]);
    release("value");
    const results = await pending;

    expect(results).toEqual(["value", "value", "value"]);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.getMetrics().singleFlightCoalesced).toBe(2);
  });

  it("recomputes after TTL expiry", async () => {
    const { cache } = makeCache();
    let counter = 0;
    const compute = vi.fn(async () => ++counter);

    await cache.getOrSet("k", compute, { ttlMs: 1_000 });
    advance(1_001);
    const value = await cache.getOrSet("k", compute, { ttlMs: 1_000 });

    expect(value).toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("serves stale within the SWR window and refreshes in the background", async () => {
    const { cache } = makeCache();
    let counter = 0;
    const compute = vi.fn(async () => ++counter);

    await cache.getOrSet("swr-key", compute, { ttlMs: 1_000, swrMs: 5_000 });
    advance(1_500); // stale but alive

    const stale = await cache.getOrSet("swr-key", compute, { ttlMs: 1_000, swrMs: 5_000 });
    expect(stale).toBe(1); // stale value served instantly
    expect(cache.getMetrics().staleServed).toBe(1);
    expect(cache.getMetrics().backgroundRefreshes).toBe(1);

    await flushMicrotasks(); // let the background refresh land
    const fresh = await cache.getOrSet("swr-key", compute, { ttlMs: 1_000, swrMs: 5_000 });
    expect(fresh).toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("promotes L2 hits into L1", async () => {
    const { cache } = makeCache();
    const compute = vi.fn(async () => "payload");

    await cache.getOrSet("promo", compute, { ttlMs: 60_000 });
    cache.clearL1(); // simulate another process / cold L1

    const value = await cache.getOrSet("promo", compute, { ttlMs: 60_000 });
    expect(value).toBe("payload");
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.getMetrics().l2Hits).toBe(1);
    expect(cache.getL1Size()).toBe(1); // promoted
  });

  it("invalidateTag removes every tagged entry in both tiers", async () => {
    const { cache, redis } = makeCache();
    const compute = vi.fn(async () => "v");

    await cache.getOrSet("courses:list", compute, { tags: ["courses"] });
    await cache.getOrSet("courses:featured", compute, { tags: ["courses"] });
    await cache.getOrSet("other:key", compute, { tags: ["other"] });

    const removed = await cache.invalidateTag("courses");
    expect(removed).toBeGreaterThanOrEqual(2);

    // L1 gone.
    expect(await cache.get("courses:list")).toBeUndefined();
    expect(await cache.get("courses:featured")).toBeUndefined();
    // L2 gone.
    expect(redis.store.has("tolo:cache:entry:courses:list")).toBe(false);
    expect(redis.store.has("tolo:cache:entry:courses:featured")).toBe(false);
    // Untagged entries survive.
    expect(await cache.get("other:key")).toBe("v");
    expect(cache.getMetrics().tagInvalidations).toBe(1);
  });


  it("degrades to L1-only when Redis is unavailable", async () => {
    nowMs = 1_000_000;
    const cache = new ServerCache({
      now: () => nowMs,
      redisClientFactory: async () => null,
    });
    const compute = vi.fn(async () => "offline");

    expect(await cache.getOrSet("k", compute)).toBe("offline");
    expect(await cache.getOrSet("k", compute)).toBe("offline");
    expect(compute).toHaveBeenCalledTimes(1);

    await expect(cache.set("a", 1)).resolves.toBeUndefined();
    await expect(cache.delete("a")).resolves.toBeUndefined();
    await expect(cache.invalidateTag("t")).resolves.toBe(0);
  });

  it("never propagates Redis errors to callers", async () => {
    const { cache, redis } = makeCache();
    redis.failNextOp = true; // first GET after miss
    const compute = vi.fn(async () => "resilient");

    const value = await cache.getOrSet("flaky", compute);
    expect(value).toBe("resilient");
    expect(cache.getMetrics().redisErrors).toBeGreaterThan(0);
  });

  it("rejects invalid keys and tags", async () => {
    const { cache } = makeCache();
    const compute = async () => "x";

    await expect(cache.getOrSet("bad key!", compute)).rejects.toThrow(/Invalid cache key/);
    await expect(cache.getOrSet("ok", compute, { tags: ["bad tag!"] })).rejects.toThrow(
      /Invalid cache tag/,
    );
    await expect(cache.getOrSet("ok", compute, { ttlMs: 0 })).rejects.toThrow(/ttlMs/);
  });

  it("evicts least-recently-used L1 entries beyond the cap", async () => {
    const { cache } = makeCache(undefined, { l1MaxEntries: 2 });
    const compute = async () => "v";

    await cache.getOrSet("k1", compute);
    await cache.getOrSet("k2", compute);
    await cache.getOrSet("k1", compute); // touch k1 → k2 becomes oldest
    await cache.getOrSet("k3", compute); // evicts k2

    expect(cache.getL1Size()).toBe(2);
    // k1 still in L1 (hit without compute), k2 fell back to L2.
    const metrics = cache.getMetrics();
    expect(metrics.l1Hits).toBeGreaterThanOrEqual(1);
  });

  it("exposes metrics with a sane hit rate", async () => {
    const { cache } = makeCache();
    const compute = vi.fn(async () => 1);

    await cache.getOrSet("m", compute);
    await cache.getOrSet("m", compute);
    await cache.getOrSet("m", compute);

    const metrics = cache.getMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.l1Hits).toBe(2);
    expect(metrics.hitRate).toBeCloseTo(2 / 3);
  });

  it("CACHE_TTL presets are ordered and positive", () => {
    expect(CACHE_TTL.SHORT).toBeLessThan(CACHE_TTL.MEDIUM);
    expect(CACHE_TTL.MEDIUM).toBeLessThan(CACHE_TTL.LONG);
    expect(CACHE_TTL.LONG).toBeLessThan(CACHE_TTL.DAY);
  });
});

