/**
 * Auth Cache Service
 * Centralized caching for authentication-related database queries
 * Improves login performance by reducing database round-trips
 */

import { CacheService } from '@/lib/cache-service-unified';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface CachedUser {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string;
    role: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    phoneNumber?: string | null;
    lockedUntil?: Date | null;
}

export interface CachedSession {
    id: string;
    userId: string;
    expiresAt: Date;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    isValid: boolean;
}

export interface CacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
    avgLatencyMs: number;
}

// ==================== CACHE KEYS ====================

const CACHE_KEYS = {
    user: (email: string) => `auth:user:email:${email.toLowerCase()}`,
    userById: (id: string) => `auth:user:id:${id}`,
    session: (sessionId: string) => `auth:session:${sessionId}`,
    userSessions: (userId: string) => `auth:user:${userId}:sessions`,
    loginAttempts: (email: string) => `auth:attempts:${email.toLowerCase()}`,
    securitySettings: (userId: string) => `auth:security:${userId}`,
} as const;

// ==================== CACHE TTLs ====================

const CACHE_TTL = {
    user: 300,           // 5 minutes
    session: 600,        // 10 minutes
    securitySettings: 300, // 5 minutes
    loginAttempts: 900,  // 15 minutes
} as const;

// ==================== METRICS ====================

class CacheMetricsTracker {
    private hits = 0;
    private misses = 0;
    private totalLatencyMs = 0;
    private operationCount = 0;

    recordHit(latencyMs: number): void {
        this.hits++;
        this.totalLatencyMs += latencyMs;
        this.operationCount++;
    }

    recordMiss(latencyMs: number): void {
        this.misses++;
        this.totalLatencyMs += latencyMs;
        this.operationCount++;
    }

    getMetrics(): CacheMetrics {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
            avgLatencyMs: this.operationCount > 0
                ? this.totalLatencyMs / this.operationCount
                : 0,
        };
    }

    reset(): void {
        this.hits = 0;
        this.misses = 0;
        this.totalLatencyMs = 0;
        this.operationCount = 0;
    }
}

// ==================== AUTH CACHE SERVICE ====================

class AuthCacheServiceClass {
    private metrics = new CacheMetricsTracker();

    /**
     * Get cached user by email
     */
    async getUser(email: string): Promise<CachedUser | null> {
        const start = Date.now();
        const key = CACHE_KEYS.user(email);

        try {
            const cached = await CacheService.get<CachedUser>(key);
            const latency = Date.now() - start;

            if (cached) {
                this.metrics.recordHit(latency);
                logger.debug(`Cache HIT for user: ${email.substring(0, 3)}***`);
                return cached;
            }

            this.metrics.recordMiss(latency);
            logger.debug(`Cache MISS for user: ${email.substring(0, 3)}***`);
            return null;
        } catch (error) {
            logger.warn('Auth cache get error:', error);
            return null;
        }
    }

    /**
     * Cache user data
     */
    async cacheUser(user: CachedUser): Promise<void> {
        try {
            const emailKey = CACHE_KEYS.user(user.email);
            const idKey = CACHE_KEYS.userById(user.id);

            // Cache by both email and ID for different lookup patterns
            await Promise.all([
                CacheService.set(emailKey, user, CACHE_TTL.user),
                CacheService.set(idKey, user, CACHE_TTL.user),
            ]);

            logger.debug(`Cached user: ${user.email.substring(0, 3)}***`);
        } catch (error) {
            logger.warn('Auth cache set error:', error);
        }
    }

    /**
     * Invalidate user cache
     */
    async invalidateUser(userId: string, email?: string): Promise<void> {
        try {
            const keys = [CACHE_KEYS.userById(userId)];
            if (email) {
                keys.push(CACHE_KEYS.user(email));
            }

            await Promise.all(keys.map(key => CacheService.del(key)));
            logger.debug(`Invalidated cache for user: ${userId.substring(0, 8)}...`);
        } catch (error) {
            logger.warn('Auth cache invalidation error:', error);
        }
    }

    /**
     * Get cached session
     */
    async getSession(sessionId: string): Promise<CachedSession | null> {
        const start = Date.now();
        const key = CACHE_KEYS.session(sessionId);

        try {
            const cached = await CacheService.get<CachedSession>(key);
            const latency = Date.now() - start;

            if (cached) {
                // Check if session is still valid
                if (new Date(cached.expiresAt) < new Date()) {
                    await this.invalidateSession(sessionId);
                    this.metrics.recordMiss(latency);
                    return null;
                }

                this.metrics.recordHit(latency);
                return cached;
            }

            this.metrics.recordMiss(latency);
            return null;
        } catch (error) {
            logger.warn('Session cache get error:', error);
            return null;
        }
    }

    /**
     * Cache session data
     */
    async cacheSession(session: CachedSession): Promise<void> {
        try {
            const key = CACHE_KEYS.session(session.id);

            // Calculate TTL based on session expiry
            const expiresAt = new Date(session.expiresAt);
            const ttl = Math.max(
                Math.floor((expiresAt.getTime() - Date.now()) / 1000),
                60 // Minimum 1 minute
            );

            await CacheService.set(key, session, Math.min(ttl, CACHE_TTL.session));
            logger.debug(`Cached session: ${session.id.substring(0, 8)}...`);
        } catch (error) {
            logger.warn('Session cache set error:', error);
        }
    }

    /**
     * Invalidate session cache
     */
    async invalidateSession(sessionId: string): Promise<void> {
        try {
            await CacheService.del(CACHE_KEYS.session(sessionId));
            logger.debug(`Invalidated session: ${sessionId.substring(0, 8)}...`);
        } catch (error) {
            logger.warn('Session cache invalidation error:', error);
        }
    }

    /**
     * Invalidate all sessions for a user
     */
    async invalidateUserSessions(userId: string): Promise<void> {
        try {
            // Pattern-based invalidation
            await CacheService.invalidatePattern(`auth:session:*${userId}*`);
            logger.debug(`Invalidated all sessions for user: ${userId.substring(0, 8)}...`);
        } catch (error) {
            logger.warn('User sessions cache invalidation error:', error);
        }
    }

    /**
     * Get or set user with cache-through pattern
     */
    async getOrSetUser(
        email: string,
        fetchFn: () => Promise<CachedUser | null>
    ): Promise<CachedUser | null> {
        // Try cache first
        const cached = await this.getUser(email);
        if (cached) return cached;

        // Fetch from database
        const user = await fetchFn();
        if (user) {
            await this.cacheUser(user);
        }

        return user;
    }

    /**
     * Get cache metrics
     */
    getMetrics(): CacheMetrics {
        return this.metrics.getMetrics();
    }

    /**
     * Reset cache metrics
     */
    resetMetrics(): void {
        this.metrics.reset();
    }

    /**
     * Warm cache for frequently accessed users
     */
    async warmCache(users: CachedUser[]): Promise<void> {
        try {
            await Promise.all(users.map(user => this.cacheUser(user)));
            logger.info(`Warmed cache for ${users.length} users`);
        } catch (error) {
            logger.warn('Cache warming error:', error);
        }
    }
}

// Export singleton instance
export const AuthCacheService = new AuthCacheServiceClass();

// Export cache keys for external use
export { CACHE_KEYS, CACHE_TTL };
