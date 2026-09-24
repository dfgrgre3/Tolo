/**
 * Unified Server-Side Cache — طبقة الكاش الموحّدة على السيرفر
 *
 * Two-tier cache with stampede protection, tag invalidation and
 * stale-while-revalidate, designed to sit in front of expensive
 * server-side work (backend API calls, DB queries, heavy computations).
 *
 * Architecture
 * ------------
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  L1: In-process LRU (Map) — sub-microsecond reads        │
 *   │      Short TTL, per-process, lost on restart             │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  L2: Redis (shared across processes / restarts)          │
 *   │      Authoritative TTL via PX, tag sets for invalidation │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Guarantees
 * ----------
 *   1. Single-flight: N concurrent `getOrSet` calls for the same key
 *      execute the compute function exactly once and share the promise
 *      (cache stampede / dogpile protection).
 *   2. Graceful degradation: if Redis is missing, misconfigured or down,
 *      every operation silently falls back to L1-only. Redis errors NEVER
 *      propagate to callers — a cache must not take the app down.
 *   3. Tag invalidation: entries can carry tags; `invalidateTag("courses")`
 *      wipes every entry tagged "courses" in BOTH layers.
 *   4. Stale-while-revalidate: an entry past its TTL but within its SWR
 *      window is served instantly while ONE background refresh repopulates
 *      the cache.
 *   5. Observable: hit/miss/error counters via `getMetrics()`.
 *
 * Consistency model
 * -----------------
 * L1 is write-through but NOT coherent across processes: a key updated by
 * process B stays stale in process A's L1 until its (short) L1 TTL lapses.
 * Keep `l1TtlMs` small for data that is invalidated cross-process, or set
 * `l1: false` for strictly consistent reads.
 */

import { logger } from "@/lib/logger";

// ─── Key validation (trust boundary) ────────────────────────────────────────
// Keys embed into Redis keyspace (`${namespace}:entry:${key}`). Constrain
// the alphabet so no caller can smuggle key-namespace syntax (wildcards,
// newlines, hash-tags) through. Mirrors the discipline in
// lib/redis/chunked-upload.ts.
const KEY_PATTERN = /^[A-Za-z0-9_.:|-]{1,256}$/;
const TAG_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      "Invalid cache key: must match /^[A-Za-z0-9_.:|-]{1,256}$/",
    );
  }
}

function assertValidTag(tag: string): void {
  if (!TAG_PATTERN.test(tag)) {
    throw new Error(
      "Invalid cache tag: must match /^[A-Za-z0-9_.:-]{1,128}$/",
    );
  }
}

// ─── TTL presets (ms) ───────────────────────────────────────────────────────
export const CACHE_TTL = {
  /** 30s — volatile dashboards, counters. */
  SHORT: 30_000,
  /** 5m — default for most API-shaped data. */
  MEDIUM: 5 * 60_000,
  /** 1h — catalogs, course lists, settings. */
  LONG: 60 * 60_000,
  /** 24h — near-static content (CMS pages, category trees). */
  DAY: 24 * 60 * 60_000,
} as const;

/** Default L1 TTL cap: L1 must always be shorter-lived than L2 so a
 * cross-process invalidation converges quickly. */
const DEFAULT_L1_TTL_CAP_MS = 15_000;
const DEFAULT_L1_MAX_ENTRIES = 500;


// ─── Minimal Redis surface (dependency-injectable for tests) ────────────────
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  pexpire(key: string, ms: number): Promise<number>;
}

export type RedisClientFactory = () => Promise<RedisLike | null>;

// ─── Entry shapes ───────────────────────────────────────────────────────────
interface StoredEnvelope<T> {
  /** Cached payload. */
  v: T;
  /** Epoch ms after which the entry is stale. */
  exp: number;
  /** Epoch ms after which the entry is unusable even for SWR. */
  dead: number;
  /** Tags registered on this entry (kept in the envelope so L2 promotions
   *  can re-index L1 tags without a second lookup). */
  t: string[];
}

export interface GetOrSetOptions {
  /** Time-to-live before the entry becomes stale. Default: CACHE_TTL.MEDIUM. */
  ttlMs?: number;
  /**
   * Extra stale-while-revalidate window (ms) AFTER `ttlMs` during which the
   * stale value is served while a single background refresh repopulates.
   * Default: 0 (disabled).
   */
  swrMs?: number;
  /** Tags for group invalidation via {@link ServerCache.invalidateTag}. */
  tags?: readonly string[];
  /**
   * L1 (in-memory) TTL. Defaults to min(ttlMs, 15s) so cross-process
   * invalidations converge quickly. Pass `false` to skip L1 entirely.
   */
  l1TtlMs?: number | false;
}

export interface CacheMetrics {
  l1Hits: number;
  l2Hits: number;
  misses: number;
  staleServed: number;
  sets: number;
  deletes: number;
  tagInvalidations: number;
  /** Concurrent getOrSet calls that shared an in-flight compute promise. */
  singleFlightCoalesced: number;
  /** Stale entries that triggered a background refresh. */
  backgroundRefreshes: number;
  redisErrors: number;
  /** Overall hit ratio across both tiers (0..1, NaN-safe → 0). */
  hitRate: number;
}

export interface ServerCacheOptions {
  /** Redis key prefix. Default "tolo:cache". */
  namespace?: string;
  /** Max L1 entries before LRU eviction. Default 500. */
  l1MaxEntries?: number;
  /** Injected Redis factory — tests pass a fake; production uses the
   *  lazy `@/lib/redis/client` singleton. */
  redisClientFactory?: RedisClientFactory;
  /** Clock override for tests. Default Date.now. */
  now?: () => number;
}

interface L1Entry<T = unknown> {
  value: T;
  /** Epoch ms when this L1 copy expires (independent of L2 TTL). */
  expiresAt: number;
  /** Envelope metadata needed for SWR decisions without touching L2. */
  staleAt: number;
  deadAt: number;
  tags: string[];
}

// ─── Implementation ─────────────────────────────────────────────────────────
export class ServerCache {
  private readonly namespace: string;
  private readonly l1MaxEntries: number;
  private readonly redisFactory: RedisClientFactory;
  private readonly now: () => number;

  /** L1 store. Map insertion order doubles as LRU order: on every hit we
   *  delete+re-set so the most-recently-used entry moves to the tail. */
  private readonly l1 = new Map<string, L1Entry>();
  /** tag → keys present in L1 (for local tag invalidation). */
  private readonly l1Tags = new Map<string, Set<string>>();
  /** key → in-flight compute promise (single-flight registry). */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  private readonly counters = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    staleServed: 0,
    sets: 0,
    deletes: 0,
    tagInvalidations: 0,
    singleFlightCoalesced: 0,
    backgroundRefreshes: 0,
    redisErrors: 0,
  };

  constructor(options: ServerCacheOptions = {}) {
    this.namespace = options.namespace ?? "tolo:cache";
    this.l1MaxEntries = options.l1MaxEntries ?? DEFAULT_L1_MAX_ENTRIES;
    this.now = options.now ?? (() => Date.now());
    this.redisFactory = options.redisClientFactory ?? defaultRedisFactory;
  }

  // ── Key helpers ──────────────────────────────────────────────────────────
  private entryKey(key: string): string {
    return `${this.namespace}:entry:${key}`;
  }

  private tagKey(tag: string): string {
    return `${this.namespace}:tag:${tag}`;
  }

  private async redis(): Promise<RedisLike | null> {
    try {
      return await this.redisFactory();
    } catch (error) {
      this.counters.redisErrors += 1;
      logger.warn("[ServerCache] Redis factory failed, L1-only mode:", error);
      return null;
    }
  }

  // ── L1 primitives ─────────────────────────────────────────────────────────
  private l1Get(key: string): L1Entry | null {
    const entry = this.l1.get(key);
    if (!entry) return null;
    const now = this.now();
    if (now >= entry.deadAt) {
      this.l1Delete(key);
      return null;
    }
    // LRU touch: move to tail.
    this.l1.delete(key);
    this.l1.set(key, entry);
    return entry;
  }

  private l1Set<T>(key: string, envelope: StoredEnvelope<T>, l1TtlMs: number): void {
    this.l1Delete(key); // drop old entry + stale tag references
    const now = this.now();
    const entry: L1Entry<T> = {
      value: envelope.v,
      expiresAt: Math.min(now + l1TtlMs, envelope.dead),
      staleAt: envelope.exp,
      deadAt: envelope.dead,
      tags: [...envelope.t],
    };
    this.l1.set(key, entry);
    for (const tag of entry.tags) {
      let set = this.l1Tags.get(tag);
      if (!set) {
        set = new Set();
        this.l1Tags.set(tag, set);
      }
      set.add(key);
    }
    // LRU eviction: drop oldest (head) entries past the cap.
    while (this.l1.size > this.l1MaxEntries) {
      const oldest = this.l1.keys().next().value;
      if (oldest === undefined) break;
      this.l1Delete(oldest);
    }
  }

  private l1Delete(key: string): void {
    const entry = this.l1.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        const set = this.l1Tags.get(tag);
        if (set) {
          set.delete(key);
          if (set.size === 0) this.l1Tags.delete(tag);
        }
      }
    }
    this.l1.delete(key);
  }


  // ── L2 primitives (all error-swallowing) ──────────────────────────────────
  private async l2Get<T>(key: string): Promise<StoredEnvelope<T> | null> {
    const client = await this.redis();
    if (!client) return null;
    try {
      const raw = await client.get(this.entryKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEnvelope<T>;
      if (typeof parsed.exp !== "number" || typeof parsed.dead !== "number") {
        return null; // corrupt envelope — treat as miss
      }
      if (this.now() >= parsed.dead) return null;
      return parsed;
    } catch (error) {
      this.counters.redisErrors += 1;
      logger.warn("[ServerCache] Redis GET failed:", error);
      return null;
    }
  }

  private async l2Set<T>(
    key: string,
    envelope: StoredEnvelope<T>,
  ): Promise<void> {
    const client = await this.redis();
    if (!client) return;
    const fullKey = this.entryKey(key);
    const ttlMs = Math.max(envelope.dead - this.now(), 1);
    try {
      await client.set(fullKey, JSON.stringify(envelope), "PX", ttlMs);
      for (const tag of envelope.t) {
        const tagKey = this.tagKey(tag);
        await client.sadd(tagKey, fullKey);
        // Tag sets must not outlive their members by much; refresh the
        // expiry to the longest plausible member lifetime on every add.
        await client.pexpire(tagKey, ttlMs);
      }
    } catch (error) {
      this.counters.redisErrors += 1;
      logger.warn("[ServerCache] Redis SET failed:", error);
    }
  }

  private async l2Delete(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    const client = await this.redis();
    if (!client) return;
    try {
      await client.del(...keys.map((k) => this.entryKey(k)));
    } catch (error) {
      this.counters.redisErrors += 1;
      logger.warn("[ServerCache] Redis DEL failed:", error);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Read-through cache: returns the cached value if fresh, serves stale
   * within the SWR window (triggering one background refresh), otherwise
   * runs `compute` — exactly once even under concurrency (single-flight).
   */
  async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    options: GetOrSetOptions = {},
  ): Promise<T> {
    assertValidKey(key);
    const ttlMs = options.ttlMs ?? CACHE_TTL.MEDIUM;
    const swrMs = options.swrMs ?? 0;
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error("ttlMs must be a positive finite number");
    }
    if (!Number.isFinite(swrMs) || swrMs < 0) {
      throw new Error("swrMs must be a non-negative finite number");
    }
    const tags = [...(options.tags ?? [])];
    for (const tag of tags) assertValidTag(tag);
    const l1TtlMs =
      options.l1TtlMs === false
        ? null
        : Math.min(options.l1TtlMs ?? DEFAULT_L1_TTL_CAP_MS, ttlMs);
    const now = this.now();

    // 1) L1 lookup.
    if (l1TtlMs !== null) {
      const hit = this.l1Get(key);
      if (hit) {
        if (now < hit.staleAt) {
          this.counters.l1Hits += 1;
          return hit.value as T;
        }
        // Stale but within SWR window: serve stale + background refresh.
        this.counters.l1Hits += 1;
        this.counters.staleServed += 1;
        this.scheduleBackgroundRefresh(key, compute, ttlMs, swrMs, tags, l1TtlMs);
        return hit.value as T;
      }
    }

    // 2) L2 lookup.
    const envelope = await this.l2Get<T>(key);
    if (envelope) {
      if (now < envelope.exp) {
        this.counters.l2Hits += 1;
        if (l1TtlMs !== null) this.l1Set(key, envelope, l1TtlMs);
        return envelope.v;
      }
      // Within SWR window → serve stale + refresh in background.
      this.counters.l2Hits += 1;
      this.counters.staleServed += 1;
      if (l1TtlMs !== null) this.l1Set(key, envelope, l1TtlMs);
      this.scheduleBackgroundRefresh(key, compute, ttlMs, swrMs, tags, l1TtlMs);
      return envelope.v;
    }

    // 3) Miss — single-flight compute.
    this.counters.misses += 1;
    return this.computeSingleFlight(key, compute, ttlMs, swrMs, tags, l1TtlMs);
  }

  /** Direct read (L1 → L2). Returns undefined on miss. */
  async get<T>(key: string): Promise<T | undefined> {
    assertValidKey(key);
    const now = this.now();
    const hit = this.l1Get(key);
    if (hit && now < hit.staleAt) {
      this.counters.l1Hits += 1;
      return hit.value as T;
    }
    const envelope = await this.l2Get<T>(key);
    if (envelope && now < envelope.exp) {
      this.counters.l2Hits += 1;
      this.l1Set(key, envelope, DEFAULT_L1_TTL_CAP_MS);
      return envelope.v;
    }
    this.counters.misses += 1;
    return undefined;
  }

  /** Direct write to both tiers. */
  async set<T>(key: string, value: T, options: GetOrSetOptions = {}): Promise<void> {
    assertValidKey(key);
    const ttlMs = options.ttlMs ?? CACHE_TTL.MEDIUM;
    const swrMs = options.swrMs ?? 0;
    const tags = [...(options.tags ?? [])];
    for (const tag of tags) assertValidTag(tag);
    const now = this.now();
    const envelope: StoredEnvelope<T> = {
      v: value,
      exp: now + ttlMs,
      dead: now + ttlMs + swrMs,
      t: tags,
    };
    this.counters.sets += 1;
    if (options.l1TtlMs !== false) {
      const l1Ttl = Math.min(options.l1TtlMs ?? DEFAULT_L1_TTL_CAP_MS, ttlMs);
      this.l1Set(key, envelope, l1Ttl);
    }
    await this.l2Set(key, envelope);
  }

  /** Delete a single key from both tiers. */
  async delete(key: string): Promise<void> {
    assertValidKey(key);
    this.counters.deletes += 1;
    this.l1Delete(key);
    await this.l2Delete([key]);
  }


  /**
   * Invalidate every entry carrying `tag`, in both tiers. Local L1 entries
   * are dropped via the in-memory tag index; L2 entries via the Redis tag
   * set. Other processes' L1 copies converge within their short L1 TTL.
   */
  async invalidateTag(tag: string): Promise<number> {
    assertValidTag(tag);
    this.counters.tagInvalidations += 1;
    let removed = 0;

    // L1.
    const localKeys = this.l1Tags.get(tag);
    if (localKeys) {
      for (const key of Array.from(localKeys)) {
        this.l1Delete(key);
        removed += 1;
      }
    }

    // L2.
    const client = await this.redis();
    if (client) {
      const tagKey = this.tagKey(tag);
      try {
        const members = await client.smembers(tagKey);
        if (members.length > 0) {
          await client.del(...members);
          removed += members.length;
        }
        await client.del(tagKey);
      } catch (error) {
        this.counters.redisErrors += 1;
        logger.warn("[ServerCache] Redis tag invalidation failed:", error);
      }
    }
    return removed;
  }

  /** Wipe the local L1 tier only (process-local). */
  clearL1(): void {
    this.l1.clear();
    this.l1Tags.clear();
  }

  /** Snapshot of cache metrics. */
  getMetrics(): CacheMetrics {
    const lookups =
      this.counters.l1Hits + this.counters.l2Hits + this.counters.misses;
    return {
      ...this.counters,
      hitRate: lookups === 0 ? 0 : (this.counters.l1Hits + this.counters.l2Hits) / lookups,
    };
  }

  /** Exposed for diagnostics / health endpoints. */
  getL1Size(): number {
    return this.l1.size;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async computeSingleFlight<T>(
    key: string,
    compute: () => Promise<T>,
    ttlMs: number,
    swrMs: number,
    tags: string[],
    l1TtlMs: number | null,
  ): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      this.counters.singleFlightCoalesced += 1;
      return existing as Promise<T>;
    }

    const task = (async (): Promise<T> => {
      try {
        const value = await compute();
        const now = this.now();
        const envelope: StoredEnvelope<T> = {
          v: value,
          exp: now + ttlMs,
          dead: now + ttlMs + swrMs,
          t: tags,
        };
        this.counters.sets += 1;
        if (l1TtlMs !== null) this.l1Set(key, envelope, l1TtlMs);
        await this.l2Set(key, envelope);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, task);
    // Prevent unhandled-rejection noise for coalesced waiters that detached.
    task.catch(() => undefined);
    return task;
  }

  /**
   * Fire-and-forget SWR refresh. Shares the single-flight registry so a
   * stale hit never triggers a second concurrent recompute.
   */
  private scheduleBackgroundRefresh<T>(
    key: string,
    compute: () => Promise<T>,
    ttlMs: number,
    swrMs: number,
    tags: string[],
    l1TtlMs: number | null,
  ): void {
    if (swrMs <= 0) return; // SWR disabled — treat as a hard miss next time
    if (this.inFlight.has(key)) return;
    this.counters.backgroundRefreshes += 1;
    void this.computeSingleFlight(key, compute, ttlMs, swrMs, tags, l1TtlMs).catch(
      (error) => {
        // Keep serving the stale entry; the next read retries the refresh.
        logger.warn("[ServerCache] Background refresh failed:", error);
      },
    );
  }
}

/**
 * Production Redis factory: lazy-imports the Redis singleton so this module
 * stays importable from non-Redis contexts (and tests) without triggering
 * the `server-only` guard or opening a connection at import time.
 */
const defaultRedisFactory: RedisClientFactory = async () => {
  try {
    const mod = await import("@/lib/redis/client");
    return (await mod.getRedisClientAsync()) as RedisLike | null;
  } catch (error) {
    logger.warn("[ServerCache] Redis client unavailable:", error);
    return null;
  }
};

/**
 * Process-wide singleton. Use this for all server-side caching unless a
 * test needs an isolated instance.
 */
export const serverCache = new ServerCache();

