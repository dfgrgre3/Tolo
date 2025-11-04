/**
 * Authentication Cache Service
 * Provides caching layer for authentication-related data to improve performance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class AuthCache {
  private static instance: AuthCache;
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number; // Time to live in milliseconds

  private constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Maximum cache entries
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  public static getInstance(): AuthCache {
    if (!AuthCache.instance) {
      AuthCache.instance = new AuthCache();
    }
    return AuthCache.instance;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data: value,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Remove 10% of oldest entries
    const entriesToRemove = Math.floor(this.maxSize * 0.1);
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      .slice(0, entriesToRemove);

    sortedEntries.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

// Singleton instance
export const authCache = AuthCache.getInstance();

/**
 * Cache keys helper
 */
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userByEmail: (email: string) => `user:email:${email}`,
  session: (sessionId: string) => `session:${sessionId}`,
  rateLimit: (clientId: string) => `ratelimit:${clientId}`,
  token: (token: string) => `token:${token.substring(0, 20)}`,
} as const;

