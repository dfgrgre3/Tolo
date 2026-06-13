/**
 * Shared Request Deduplication and Cache Manager
 * Prevents high-frequency duplicate GET requests, collapsing concurrent requests
 * and caching results locally on the client.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
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

  // Custom TTLs for specific high-frequency endpoints
  private customTTLs: Record<string, number> = {
    "/api/auth/me": 300000,                   // 5 minutes - core auth data rarely changes
    "/api/auth/refresh": 300000,              // 5 minutes
    "/api/ai/recommendations": 30000,         // 30 seconds
    "/api/categories": 60000,                 // 1 minute
    "/api/courses": 15000,                    // 15 seconds
    "/api/exams": 15000,                      // 15 seconds
    "/api/notifications": 300000,             // 5 minutes - fallback polling only
    "/api/activities/recent": 300000,         // 5 minutes - fallback polling only
    "/api/progress/summary": 300000,          // 5 minutes - CQRS view refreshes every 5 minutes
    "/api/my-courses": 300000,                // 5 minutes
    "/api/gamification/progress": 300000,     // 5 minutes
    "/api/gamification/achievements": 300000, // 5 minutes
    "/api/gamification/leaderboard": 300000,  // 5 minutes
  };

  private getTTL(url: string): number {
    for (const [route, ttl] of Object.entries(this.customTTLs)) {
      if (url.includes(route)) {
        return ttl;
      }
    }
    return this.defaultTTL;
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
      if (headers.get("Cache-Control") === "no-cache" || headers.get("Pragma") === "no-cache") {
        return "";
      }
    }

    // Ignore URLs explicitly requesting fresh/forced data
    if (url.includes("force=true") || url.includes("refresh=true")) {
      return "";
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
}

export const requestCache = new RequestCacheManager();
