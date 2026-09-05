/**
 * Shared Request Deduplication and Cache Manager
 * Prevents high-frequency duplicate GET requests, collapsing concurrent requests
 * and caching results locally on the client.
 *
 * Cache keys for USER-SCOPED routes (endpoints whose response body depends on
 * the authenticated caller) are namespaced by the current identity registered
 * via `setIdentity()`. A URL alone does not determine the response for those
 * endpoints, so binding the key to the identity guarantees a response fetched
 * as user A can never be replayed for user B inside one browser session
 * (login/logout/MFA/impersonation transitions that keep the SPA alive).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Prefix marking a cache key as identity-scoped. Never collides with `${method}:${url}` keys. */
const SCOPED_KEY_PREFIX = "@user:";

export type CacheScope = "public" | "user" | "none";

export interface EndpointCachePolicy {
  scope: CacheScope;
  ttl: number; // in milliseconds. 0 or scope="none" means non-cacheable
}

class RequestCacheManager {
  // Stores active, in-flight Promises to collapse identical concurrent requests
  private inFlight = new Map<string, Promise<any>>();

  // Stores resolved cache entries
  private cache = new Map<string, CacheEntry<any>>();

  // Max size limit to prevent memory leaks in long sessions
  private readonly maxCacheSize = 100;

  // Default cache TTL: 5 seconds (good for preventing double-clicks and rapid renders)
  private defaultTTL = 5000;

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
    "/api/billing/wallet": { scope: "user", ttl: 30000 },
    "/api/payments/history": { scope: "user", ttl: 30000 },
    "/api/subscriptions": { scope: "user", ttl: 60000 },
    "/api/schedule": { scope: "user", ttl: 60000 },
    "/api/tasks": { scope: "user", ttl: 60000 },
    "/api/reminders": { scope: "user", ttl: 60000 },
    "/api/study-sessions": { scope: "user", ttl: 60000 },
    "/api/courses/lessons/": { scope: "user", ttl: 60000 },
    "/enrollment-status": { scope: "user", ttl: 60000 },
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
   */
  public getPolicy(url: string): EndpointCachePolicy {
    for (const [route, policy] of this.policyEntries) {
      if (url.includes(route)) {
        return policy;
      }
    }
    // Default policy for unspecified routes
    return { scope: "public", ttl: this.defaultTTL };
  }

  private getTTL(url: string): number {
    return this.getPolicy(url).ttl;
  }

  private isUserScoped(url: string): boolean {
    return this.getPolicy(url).scope === "user";
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
   * Helper to wrap a standard Fetch Response
   */
  public async getResponse(
    url: string,
    options: RequestInit | undefined,
    fetcher: () => Promise<Response>
  ): Promise<Response> {
    const key = this.getCacheKey(url, options);
    if (!key) {
      return fetcher();
    }

    // 1. Check Cache
    const cached = this.cache.get(key);
    const ttl = this.getTTL(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data.clone();
    }

    // 2. Check In-Flight
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      const resp = await inFlightPromise;
      return resp.clone();
    }

    // 3. Execute Fetch
    const promise = (async () => {
      try {
        const response = await fetcher();
        if (response.ok) {
          // Clone the response to cache, returning the original
          const cachedResponse = response.clone();
          
          // Enforce max cache size limit (FIFO eviction)
          if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
              this.cache.delete(firstKey);
            }
          }
          
          this.cache.set(key, {
            data: cachedResponse,
            timestamp: Date.now()
          });
        }
        return response;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    const finalResp = await promise;
    return finalResp.clone();
  }

  /**
   * Clears the cache completely
   */
  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Registers the current authenticated identity (the user ID from /auth/me).
   * User-scoped cache entries are namespaced by this identity, and all of them
   * are evicted whenever it changes, so responses fetched under one identity
   * can never be replayed under another within the same browser session.
   * Public (unscoped) entries are kept — their content does not depend on the
   * caller's identity. Pass null when signed out or the identity is unknown.
   */
  public setIdentity(userId: string | null | undefined): void {
    const next = (typeof userId === "string" ? userId.trim() : "") || "";
    if (next === this.identityScope) return;

    this.identityScope = next;

    // Evict every identity-scoped entry (old-identity keys are unreachable
    // anyway; this also frees memory and covers in-flight write-backs).
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(SCOPED_KEY_PREFIX)) {
        this.cache.delete(key);
      }
    }
  }
}

export const requestCache = new RequestCacheManager();
