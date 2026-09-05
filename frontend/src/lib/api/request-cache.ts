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

  // Route prefixes whose GET responses are user-specific. Their cache keys
  // embed the identity scope; everything else keeps the plain `method:url` key
  // so data cached during the "identity unknown" boot phase stays reusable.
  //
  // MAINTENANCE: any new backend GET endpoint that returns per-user data MUST
  // be added here, otherwise its cached responses are shared across identities.
  private readonly userScopedRoutes: string[] = [
    "/api/my-courses",
    "/api/progress", // /api/progress/summary
    "/api/users/", // profile, progress/*, billing-summary
    "/api/analytics",
    "/api/gamification",
    "/api/ai/recommendations",
    "/api/ai/conversations",
    "/api/settings/preferences",
    "/api/activities/recent",
    "/api/notifications",
    "/api/teaching/",
    "/api/exams/results",
    "/api/billing/wallet",
    "/api/payments/history",
    "/api/subscriptions", // includes public /plans — over-scoped, harmless
    "/api/schedule",
    "/api/tasks",
    "/api/reminders",
    "/api/study-sessions",
    "/api/courses/lessons/", // lesson progress & notes (NOT /api/courses/:id/lessons)
    "/enrollment-status", // /api/courses/:id/enrollment-status
    "/api/auth/sessions",
    "/api/auth/social/accounts",
    "/api/search",
  ];

  // Custom TTLs for specific high-frequency endpoints
  // NOTE: Reduced auth TTLs to prevent stale state after login/logout.
  // The ?refresh=true query parameter still bypasses this cache entirely.
  private customTTLs: Record<string, number> = {
    "/api/auth/me": 0,                        // NO cache - auth state must always reflect current session
    "/api/auth/refresh": 0,                   // NO cache
    "/api/auth/login": 0,                     // NO cache - login always hits backend
    "/api/auth/logout": 0,                    // NO cache - logout always hits backend
    "/api/settings": 300000,                  // 5 minutes - app settings rarely change
    "/api/settings/preferences": 600000,      // 10 minutes - user preferences rarely change
    "/api/ai/recommendations": 30000,         // 30 seconds
    "/api/categories": 300000,                // 5 minutes - categories rarely change
    "/api/courses": 60000,                    // 1 minute - course listings change occasionally
    "/api/subjects": 60000,                   // 1 minute - subjects same as courses
    "/api/teachers": 300000,                  // 5 minutes - teachers rarely change
    "/api/blog": 300000,                      // 5 minutes - blog posts change occasionally
    "/api/homepage": 300000,                  // 5 minutes - homepage stats rarely change
    "/api/navigation/menu": 300000,           // 5 minutes - navigation rarely changes
    "/api/exams": 15000,                      // 15 seconds
    "/api/activities/recent": 300000,         // 5 minutes - fallback polling only
    "/api/progress/summary": 300000,          // 5 minutes - CQRS view refreshes every 5 minutes
    "/api/my-courses": 300000,                // 5 minutes
    "/api/gamification/progress": 300000,     // 5 minutes
    "/api/gamification/achievements": 300000, // 5 minutes
    "/api/gamification/leaderboard": 300000,  // 5 minutes
  };

  // Pre-sorted longest-route-first so "/api/settings/preferences" is not
  // shadowed by "/api/settings" when matching by substring.
  private readonly customTTLEntries = Object.entries(this.customTTLs).sort(
    (a, b) => b[0].length - a[0].length
  );

  private getTTL(url: string): number {
    for (const [route, ttl] of this.customTTLEntries) {
      if (url.includes(route)) {
        return ttl;
      }
    }
    return this.defaultTTL;
  }

  private isUserScoped(url: string): boolean {
    return this.userScopedRoutes.some((route) => url.includes(route));
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || "GET";
    // We only deduplicate and cache GET requests
    if (method.toUpperCase() !== "GET") return "";

    // If not in browser (server-side), do NOT cache/deduplicate to prevent cross-request leakage
    if (typeof window === 'undefined') return "";

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

    // User-scoped resources: the URL alone does not determine the response
    // body, so bind the key to the current identity scope.
    if (this.isUserScoped(url)) {
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
