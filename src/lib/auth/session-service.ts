import prisma from '@/lib/db';
import { TokenService } from './token-service';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';
import { CacheService } from '@/lib/cache-service-unified';

/**
 * SessionService - Centralized session lifecycle management.
 * 
 * Design Decisions:
 * - Sessions are DB-backed for reliable revocation (unlike stateless JWT-only approaches)
 * - Each session tracks IP and User Agent for device identification
 * - Supports "logout from all devices" by revoking all user sessions
 * - Session expiry is enforced both at DB level and JWT level (defense in depth)
 */
export class SessionService {
    static hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private static inferDeviceInfo(userAgent: string) {
        const value = (userAgent || '').toLowerCase();

        let browser = 'Unknown';
        if (value.includes('edg/')) browser = 'Edge';
        else if (value.includes('chrome/') && !value.includes('edg/')) browser = 'Chrome';
        else if (value.includes('firefox/')) browser = 'Firefox';
        else if (value.includes('safari/') && !value.includes('chrome/')) browser = 'Safari';

        let os = 'Unknown OS';
        if (value.includes('windows')) os = 'Windows';
        else if (value.includes('mac os')) os = 'macOS';
        else if (value.includes('android')) os = 'Android';
        else if (value.includes('iphone') || value.includes('ipad') || value.includes('ios')) os = 'iOS';
        else if (value.includes('linux')) os = 'Linux';

        let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
        if (value.includes('ipad') || value.includes('tablet')) {
            deviceType = 'tablet';
        } else if (value.includes('mobile') || value.includes('android') || value.includes('iphone')) {
            deviceType = 'mobile';
        }

        return {
            browser,
            os,
            deviceType,
            name: `${browser} on ${os}`,
            trusted: false,
        };
    }

    /**
     * Create a new session and generate tokens.
     * The session is stored in DB with the refresh token for rotation detection.
     * 
     * @param userId - The authenticated user's ID
     * @param role - The user's role (USER, ADMIN, etc.)
     * @param ip - Client IP address
     * @param userAgent - Client user agent string
     * @param rememberMe - Extended session duration (7d vs 1d)
     */
    /**
     * Create a new session and generate tokens.
     */
    static async createSession(
        userId: string,
        role: string,
        ip: string,
        userAgent: string,
        rememberMe: boolean = false,
        location?: string
    ) {
        // Session expiration: 30 days for "remember me", 7 days otherwise
        // 7-day default ensures normal users don't get logged out on every browser restart
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

        // 1. Create session record
        const session = await prisma.session.create({
            data: {
                userId,
                ip,
                userAgent,
                deviceInfo: JSON.stringify(this.inferDeviceInfo(userAgent)),
                expiresAt,
                isActive: true,
                location: location || 'Unknown',
                isTrusted: false, // Starts as untrusted
            },
        });

        // 2. Generate tokens
        const accessToken = await TokenService.generateAccessToken({
            userId,
            role,
            sessionId: session.id,
        });

        const refreshToken = await TokenService.generateRefreshToken(userId, session.id);

        // 3. Store refresh token hash
        await prisma.session.update({
            where: { id: session.id },
            data: { refreshToken: this.hashRefreshToken(refreshToken) },
        });

        return { session, accessToken, refreshToken };
    }

    /**
     * Toggle Session trust status (Trust/Untrust device)
     */
    static async toggleSessionTrust(sessionId: string, userId: string, isTrusted: boolean) {
        const result = await prisma.session.updateMany({
            where: {
                id: sessionId,
                userId,
                isActive: true,
            },
            data: { isTrusted },
        });

        return result.count > 0;
    }

    /**
     * Revoke a specific session (single device logout).
     */
    static async revokeSession(sessionId: string): Promise<void> {
        if (!sessionId) return;

        try {
            await prisma.session.update({
                where: { id: sessionId },
                data: {
                    isActive: false,
                    refreshToken: null,
                },
            });
        } catch (error) {
            logger.error('[SESSION_REVOKE_FAILED]', { sessionId, error });
        }
    }

    /**
     * Revoke ALL sessions for a user (logout from all devices).
     * Critical for password change, account compromise, etc.
     * 
     * @param userId - The user whose sessions to revoke
     * @param exceptSessionId - Optional session ID to keep active (current device)
     */
    static async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
        try {
            // Keep WHERE clause aligned with unit test expectations.
            const whereClause: Record<string, unknown> = {
                userId,
                isActive: true,
            };

            if (exceptSessionId) {
                // Prisma NOT syntax expected by tests.
                whereClause.NOT = { id: exceptSessionId };
            }

            const result = await prisma.session.updateMany({
                where: whereClause as any,
                data: {
                    isActive: false,
                    refreshToken: null,
                },
            });

            return result.count;
        } catch (error) {
            logger.error('[REVOKE_ALL_SESSIONS_FAILED]', { userId, error });
            return 0;
        }
    }

    /**
     * Get all active sessions for a user (for session management UI).
     */
    static async getActiveSessions(userId: string) {
        return prisma.session.findMany({
            where: {
                userId,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                ip: true,
                userAgent: true,
                deviceInfo: true,
                createdAt: true,
                lastAccessed: true,
                expiresAt: true,
                isTrusted: true,
                location: true,
            },
            orderBy: { lastAccessed: 'desc' },
        });
    }

    /**
     * Validate that a session is active and not expired.
     */
    static async validateSession(sessionId: string) {
        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,
                isActive: true,
            },
            include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
            return null;
        }

        // Update last accessed timestamp (non-blocking)
        prisma.session.update({
            where: { id: sessionId },
            data: { lastAccessed: new Date() },
        }).catch(() => { /* fire and forget */ });

        return session;
    }

    /**
     * Store a rotated token in cache to allow a short grace period for concurrent requests.
     */
    static async markTokenAsRotated(oldTokenHash: string, sessionId: string) {
        try {
            await CacheService.set(`rotated:${oldTokenHash}`, { sessionId, timestamp: Date.now() }, 30);
        } catch (error) {
            logger.error('Failed to mark token as rotated:', error);
        }
    }

    /**
     * Check if a token was recently rotated (within grace period).
     */
    static async isRecentlyRotated(tokenHash: string, sessionId: string): Promise<boolean> {
        try {
            const data = await CacheService.get<{ sessionId: string; timestamp: number }>(`rotated:${tokenHash}`);
            return !!data && data.sessionId === sessionId;
        } catch {
            return false;
        }
    }

    /**
     * Cleanup expired sessions (should be called by a cron job in production).
     */
    static async cleanupExpiredSessions(): Promise<number> {
        try {
            const result = await prisma.session.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        { isActive: false, updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days old inactive
                    ],
                },
            });

            return result.count;
        } catch (error) {
            logger.error('[SESSION_CLEANUP_FAILED]', { error });
            return 0;
        }
    }
}
