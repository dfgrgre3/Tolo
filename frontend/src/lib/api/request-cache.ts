/**
 * Shared Request Deduplication Manager
 *
 * Prevents high-frequency duplicate GET requests by collapsing CONCURRENT
 * identical fetches onto a single in-flight promise. It deliberately does
 * NOT keep a long-lived response cache — that role belongs to TanStack
 * Query (see `react-query-persistence.tsx`), which already owns caching,
 * staleness, invalidation, and persistence.
 *
 * Storing full response bodies here created two parallel cache layers
 * (RequestCache → TanStack Query → IndexedDB) with independent TTLs and
 * independent invalidation rules. The result was duplicate memory,
 * stale-on-stale mismatches, and double invalidation work on every
 * mutation. The contract below is intentionally minimal:
 *
 *   1. Concurrent identical GETs share one in-flight promise
 *      (`Promise<Response>`), each waiter gets its own `.clone()`.
 *   2. Server-side HTTP cache semantics (`Cache-Control`, `Vary`,
 *      `Set-Cookie`) are still honored — see `canStoreResponse()`. A
 *      `Cache-Control: no-store` / `no-cache` / `private`, a `Set-Cookie`,
 *      or a `Vary: Authorization/Cookie` response will be passed through
 *      without any client-side replay (TanStack Query owns the actual
 *      re-use decision via `staleTime`).
 *   3. Identity scoping is preserved for the in-flight key so an
 *      in-flight response for user A can never be coalesced with an
 *      identical-looking in-flight request for user B (login/logout/MFA
 *      /impersonation transitions).
 *
 * If/when TanStack Query is removed, this module is the only place that
 * needs new caching logic; it should stay the deduplication primitive.
 */

/** Prefix marking a cache key as identity-scoped. Never collides with `${method}:${url}` keys. */
const SCOPED_KEY_PREFIX = "@user:";

export type CacheScope = "public" | "user" | "none";

export interface EndpointCachePolicy {
  scope: CacheScope;
  ttl: number; // in milliseconds. 0 or scope="none" means non-cacheable
}

/** Strips the query/hash and any origin so matching is done on the path only. */
function pathnameOnly(url: string): string {
  const withoutQuery = url.split(/[?#]/, 1)[0] ?? url;
  const schemeEnd = withoutQuery.indexOf("://");
  if (schemeEnd !== -1) {
    const slash = withoutQuery.indexOf("/", schemeEnd + 3);
    return slash === -1 ? "/" : withoutQuery.slice(slash);
  }
  return withoutQuery;
}

/**
 * Segment-aware policy matcher. A policy key matches the exact path or any of
 * its sub-paths only — never a sibling with a shared textual prefix
 * (e.g. "/api/courses" must not match "/api/courses-external").
 * - A trailing "/" key ("/api/users/") means "any URL under that segment prefix".
 * - A "*" pattern (e.g. "/api/courses/…/enrollment-status" where "…" is one
 *   single segment, written as a literal star in the key) requires that the
 *   wildcard stand for exactly one non-empty path segment.
 */
function routeMatches(pathname: string, route: string): boolean {
  if (route.includes("*")) {
    // Single middle-segment wildcard (e.g. "/api/courses/*/enrollment-status").
    // "*" must stand for exactly one non-empty path segment.
    const starIndex = route.indexOf("*");
    const prefix = route.slice(0, starIndex);
    const suffix = route.slice(starIndex + 1);
    if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return false;
    const middle = pathname.slice(prefix.length, pathname.length - suffix.length);
    return middle.length > 0 && !middle.includes("/");
  }
  if (route.endsWith("/")) {
    return pathname.startsWith(route);
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Honors the server's own caching directives. A response must never be stored
 * when the origin marks it as private/non-cacheable, when it carries a
 * Set-Cookie (identity-affecting), or when it varies on identity headers.
 */
function canStoreResponse(response: Response): boolean {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  const pragma = response.headers.get("pragma")?.toLowerCase() ?? "";
  const vary = response.headers.get("vary")?.toLowerCase() ?? "";
  const denied =
    cacheControl.includes("no-store") ||
    cacheControl.includes("no-cache") ||
    cacheControl.includes("private") ||
    pragma.includes("no-cache") ||
    response.headers.has("set-cookie") ||
    vary.includes("authorization") ||
    vary.includes("cookie");
  return !denied;
}

class RequestCacheManager {
  // Stores active, in-flight Promises to collapse identical concurrent
  // requests onto a single network call. Entries are removed as soon as
  // the underlying fetch resolves (success or failure), so this map never
  // grows past the current burst of identical concurrent calls.
  private inFlight = new Map<string, Promise<Response>>();

  // Cap the number of simultaneously-deduplicated fetches. This is a
  // pathological-case guard (e.g. a single render firing 1000 GETs at the
  // same URL); in normal traffic the map peaks at a handful of entries.
  private readonly maxInFlightEntries = 200;

  // Current authenticated identity scope. "" = not yet resolved (page load
  // before /auth/me answers) or signed out.
  private identityScope = "";

  /**
   * Declarative Endpoint Metadata & Cache Policies
   * Replaces ad-hoc string inspections. Every endpoint explicitly declares its:
   * - scope: "none" (strictly non-cacheable), "user" (identity-bound), or "public" (shared)
   * - ttl: cache lifetime in ms
   */
  private readonly endpointPolicies: Record<string, EndpointCachePolicy> = {
    // Auth endpoints: strictly NON-CACHEABLE by policy
    "/api/auth/me": { scope: "none", ttl: 0 },
    "/api/auth/refresh": { scope: "none", ttl: 0 },
    "/api/auth/login": { scope: "none", ttl: 0 },
    "/api/auth/logout": { scope: "none", ttl: 0 },
    "/api/auth/sessions": { scope: "user", ttl: 0 },
    "/api/auth/social/accounts": { scope: "user", ttl: 0 },

    // User-scoped resources: partitioned by authenticated user identity
    "/api/my-courses": { scope: "user", ttl: 300000 },
    "/api/progress/summary": { scope: "user", ttl: 300000 },
    "/api/progress": { scope: "user", ttl: 300000 },
    "/api/users/": { scope: "user", ttl: 60000 },
    "/api/analytics": { scope: "user", ttl: 60000 },
    "/api/gamification/progress": { scope: "user", ttl: 300000 },
    "/api/gamification/achievements": { scope: "user", ttl: 300000 },
    "/api/gamification/leaderboard": { scope: "user", ttl: 300000 },
    "/api/gamification": { scope: "user", ttl: 300000 },
    "/api/ai/recommendations": { scope: "user", ttl: 30000 },
    "/api/ai/conversations": { scope: "user", ttl: 30000 },
    "/api/settings/preferences": { scope: "user", ttl: 600000 },
    "/api/activities/recent": { scope: "user", ttl: 300000 },
    "/api/notifications": { scope: "user", ttl: 30000 },
    "/api/teaching/": { scope: "user", ttl: 60000 },
    "/api/exams/results": { scope: "user", ttl: 0 }, // exam results reflect latest submissions immediately
    // Financial data: NEVER cache. Must reflect latest state immediately after
    // mutations (wallet top-up, payment success, subscription change).
    // Rely on server-side invalidation / fresh fetches post-mutation.
    "/api/billing/wallet": { scope: "user", ttl: 0 },
    "/api/payments/history": { scope: "user", ttl: 0 },
    "/api/subscriptions": { scope: "user", ttl: 0 },
    "/api/schedule": { scope: "user", ttl: 60000 },
    "/api/tasks": { scope: "user", ttl: 60000 },
    "/api/reminders": { scope: "user", ttl: 60000 },
    "/api/study-sessions": { scope: "user", ttl: 60000 },
    "/api/courses/lessons/": { scope: "user", ttl: 60000 },
    "/api/courses/*/enrollment-status": { scope: "user", ttl: 60000 },
    "/api/search": { scope: "user", ttl: 30000 },

    // Public / Shared resources
    "/api/settings": { scope: "public", ttl: 300000 },
    "/api/categories": { scope: "public", ttl: 300000 },
    "/api/courses": { scope: "public", ttl: 60000 },
    "/api/subjects": { scope: "public", ttl: 60000 },
    "/api/teachers": { scope: "public", ttl: 300000 },
    "/api/blog": { scope: "public", ttl: 300000 },
    "/api/homepage": { scope: "public", ttl: 300000 },
    "/api/navigation/menu": { scope: "public", ttl: 300000 },
    "/api/exams": { scope: "public", ttl: 15000 },
  };

  // Pre-sorted longest-route-first to avoid substring shadowing (e.g. /api/settings/preferences vs /api/settings)
  private readonly policyEntries = Object.entries(this.endpointPolicies).sort(
    (a, b) => b[0].length - a[0].length
  );

  /**
   * Resolves the cache policy metadata for a given request URL.
   *
   * Matching is segment-aware (never substring-blind), so an entry like
   * "/api/courses" does NOT shadow "/api/courses-external" and a policy keyed
   * "/enrollment-status" can not capture "/api/other/enrollment-status".
   */
  public getPolicy(url: string): EndpointCachePolicy {
    const pathname = pathnameOnly(url);
    for (const [route, policy] of this.policyEntries) {
      if (routeMatches(pathname, route)) {
        return policy;
      }
    }
    // SECURITY: fail closed. Any endpoint not explicitly declared is treated as
    // non-cacheable. A "public" fallback here would silently share responses of
    // undeclared private endpoints across users within the same browser session.
    return { scope: "none", ttl: 0 };
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || "GET";
    // We only deduplicate and cache GET requests
    if (method.toUpperCase() !== "GET") return "";

    // If not in browser (server-side), do NOT cache/deduplicate to prevent cross-request leakage
    if (typeof window === 'undefined') return "";

    // Check endpoint cache policy metadata
    const policy = this.getPolicy(url);
    if (policy.scope === "none" || policy.ttl <= 0) {
      return "";
    }

    // Check if the request explicitly bypasses cache
    if (options?.headers) {
      const headers = new Headers(options.headers);
      if (
        headers.get("Cache-Control") === "no-cache" ||
        headers.get("Pragma") === "no-cache" ||
        headers.get("X-Bypass-Cache") === "true" ||
        headers.get("x-bypass-cache") === "true"
      ) {
        return "";
      }
    }

    // Ignore URLs explicitly requesting fresh/forced data
    if (url.includes("force=true") || url.includes("refresh=true") || url.includes("_t=")) {
      return "";
    }

    // User-scoped resources: bind key to authenticated identity scope
    if (policy.scope === "user") {
      return `${SCOPED_KEY_PREFIX}${this.identityScope}|${method}:${url}`;
    }

    return `${method}:${url}`;
  }

  /**
   * Helper to wrap a standard Fetch Response with deduplication.
   *
   * The returned `Response` is either:
   *   - a `.clone()` of the in-flight shared promise (when a concurrent
   *     identical GET is already running), or
   *   - the fresh response from `fetcher()`.
   *
   * No full-body caching is performed here. TanStack Query owns the
   * response cache (see `react-query-persistence.tsx`); we only collapse
   * concurrent requests. This avoids two parallel cache layers drifting
   * out of sync and keeps peak memory bounded by the in-flight burst.
   *
   * Server-side cache directives are still respected via
   * `canStoreResponse()` so we never replay a `no-store` /
   * `Set-Cookie` / identity-varying response through any mechanism.
   */
  public async getResponse(
    url: string,
    options: RequestInit | undefined,
    fetcher: () => Promise<Response>
  ): Promise<Response> {
    const key = this.getCacheKey(url, options);

    // Coalesce concurrent identical dedup-eligible requests onto a single
    // in-flight promise so we never fire the same GET twice while one is
    // already running. Each waiter gets its own `Response.clone()` so
    // concurrent `.json()` reads on the returned Response don't collide
    // — `Response.body` is single-use.
    if (key) {
      const inFlightPromise = this.inFlight.get(key);
      if (inFlightPromise) {
        const shared = await inFlightPromise;
        return shared.clone();
      }
    }

    const promise = (async (): Promise<Response> => {
      try {
        const response = await fetcher();

        // Non-dedup-eligible (auth, no-store, identity=ttl=0, etc.) —
        // return as-is. We still funnel through here so callers get a
        // consistent wrapper around the live Response.
        if (!key || !response.ok || !canStoreResponse(response)) {
          return response;
        }

        return response;
      } finally {
        if (key) {
          this.inFlight.delete(key);
        }
      }
    })();

    if (key) {
      // Pathological-case guard: a runaway renderer firing thousands of
      // identical GETs would otherwise grow the in-flight map without
      // bound. Bail out and fall through to the fetcher.
      if (this.inFlight.size >= this.maxInFlightEntries) {
        return fetcher();
      }
      this.inFlight.set(key, promise);
    }
    return promise;
  }

  /**
   * Clears the deduplication state. Called on logout and on broad
   * invalidation so an in-flight response for a previous identity cannot
   * be replayed for the next.
   *
   * Note: this no longer touches a response cache — TanStack Query owns
   * that and must be invalidated via its own APIs (`queryClient.clear()`).
   */
  public clear(): void {
    this.inFlight.clear();
  }

  /**
   * Drops any in-flight dedup promise whose URL matches the given path
   * prefix. Intended as a safety net after mutations that should be
   * reflected on the next read (e.g. POST /api/tasks → cancel pending
   * /api/tasks GETs). Most mutations should invalidate TanStack Query
   * directly; this is only useful when an in-flight response is known to
   * be stale and the caller wants to prevent it from being delivered.
   *
   * Matching is segment-aware on the pathname (after origin/query
   * stripping).
   */
  public invalidateByPrefix(urlPrefix: string): void {
    this.dropInFlightByPrefix(urlPrefix);
  }

  /**
   * Drops in-flight entries whose key starts with the identity-scope
   * prefix. Use after broad mutations that may affect multiple
   * user-scoped resources at once (e.g. a payment success that updates
   * wallet + subscription + payment history simultaneously).
   */
  public invalidateUserScope(): void {
    for (const key of Array.from(this.inFlight.keys())) {
      if (key.startsWith(SCOPED_KEY_PREFIX)) {
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Convenience invalidator combining both: drops in-flight entries
   * (public + user-scoped) whose URL matches the given path prefix.
   */
  public invalidateAllByPrefix(urlPrefix: string): void {
    this.dropInFlightByPrefix(urlPrefix);
  }

  private dropInFlightByPrefix(urlPrefix: string): void {
    const prefixPath = pathnameOnly(urlPrefix).replace(/\/+$/, "");
    if (!prefixPath) return;

    for (const key of Array.from(this.inFlight.keys())) {
      // key format: either "GET:<url>" (public) or
      // "@user:<scope>|GET:<url>" (user-scoped).
      const sepIdx = key.lastIndexOf("|GET:");
      const rawUrl =
        sepIdx === -1
          ? key.startsWith("GET:")
            ? key.slice(4)
            : null
          : key.slice(sepIdx + 5);
      if (rawUrl === null) continue;

      const candidatePath = pathnameOnly(rawUrl);
      if (
        candidatePath === prefixPath ||
        candidatePath.startsWith(`${prefixPath}/`)
      ) {
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Registers the current authenticated identity (the user ID from
   * /auth/me). Identity-scoped dedup keys are namespaced by this value,
   * and any in-flight user-scoped entry from a previous identity is
   * dropped so an in-flight response for user A can never be coalesced
   * with a request from user B within the same browser session.
   * Pass null when signed out or the identity is unknown.
   */
  public setIdentity(userId: string | null | undefined): void {
    const next = (typeof userId === "string" ? userId.trim() : "") || "";
    if (next === this.identityScope) return;

    this.identityScope = next;

    // Drop any in-flight user-scoped promise from the previous identity.
    // We deliberately keep public (unscoped) in-flight entries — they
    // don't depend on the caller's identity.
    for (const key of Array.from(this.inFlight.keys())) {
      if (key.startsWith(SCOPED_KEY_PREFIX)) {
        this.inFlight.delete(key);
      }
    }
  }
}

export const requestCache = new RequestCacheManager();
