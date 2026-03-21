import prisma from '@/lib/db-unified';
import { logger } from '@/lib/logger';

/**
 * Security Event Types for comprehensive audit logging.
 * 
 * Every security-sensitive action is logged with full context (IP, User Agent, device)
 * to enable forensic analysis and anomaly detection.
 */
export enum SecurityEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    LOGOUT_ALL_DEVICES = 'LOGOUT_ALL_DEVICES',
    REGISTER = 'REGISTER',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
    EMAIL_VERIFIED = 'EMAIL_VERIFIED',
    SESSION_REVOKED = 'SESSION_REVOKED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    REPLAY_ATTACK_DETECTED = 'REPLAY_ATTACK_DETECTED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    MAGIC_LINK_REQUESTED = 'MAGIC_LINK_REQUESTED',
    DEVICE_TRUST_CHANGE = 'DEVICE_TRUST_CHANGE',
}

interface SecurityLogInput {
    userId?: string | null;
    eventType: SecurityEventType;
    ip: string;
    userAgent: string;
    deviceInfo?: string;
    location?: string;
    metadata?: Record<string, unknown>;
}

/**
 * SecurityLogger - Centralized security event logging service.
 * 
 * Design Decision:
 * - All security events are persisted to PostgreSQL (via Prisma) for audit compliance
 * - Metadata is stored as JSON string for flexible querying
 * - Non-blocking: failures in logging never block the auth flow
 * - IP and UserAgent are always captured for forensic analysis
 */
export class SecurityLogger {
    /**
     * Log a security event to the database.
     * This method is fire-and-forget to avoid blocking auth operations.
     */
    static async log(input: SecurityLogInput): Promise<void> {
        try {
            await prisma.securityLog.create({
                data: {
                    userId: input.userId || null,
                    eventType: input.eventType,
                    ip: input.ip,
                    userAgent: input.userAgent,
                    deviceInfo: input.deviceInfo || null,
                    location: input.location || null,
                    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
                },
            });
        } catch (error) {
            // Security logging failures must never block authentication flow
            // Log to server console as fallback
            logger.error('[SECURITY_LOG_FAILED]', {
                eventType: input.eventType,
                userId: input.userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Log a successful login event.
     */
    static async logLogin(userId: string, ip: string, userAgent: string, sessionId: string): Promise<void> {
        await this.log({
            userId,
            eventType: SecurityEventType.LOGIN_SUCCESS,
            ip,
            userAgent,
            metadata: { sessionId },
        });
    }

    /**
     * Log a failed login attempt.
     * We intentionally do NOT store the attempted email to prevent data leakage in logs.
     */
    static async logFailedLogin(ip: string, userAgent: string, reason: string): Promise<void> {
        await this.log({
            eventType: SecurityEventType.LOGIN_FAILED,
            ip,
            userAgent,
            metadata: { reason },
        });
    }

    /**
     * Log logout event.
     */
    static async logLogout(userId: string, ip: string, userAgent: string, allDevices: boolean = false): Promise<void> {
        await this.log({
            userId,
            eventType: allDevices ? SecurityEventType.LOGOUT_ALL_DEVICES : SecurityEventType.LOGOUT,
            ip,
            userAgent,
        });
    }

    /**
     * Log a potential replay attack (refresh token reuse).
     * This is a critical security event that triggers session revocation.
     */
    static async logReplayAttack(userId: string, ip: string, userAgent: string, sessionId: string): Promise<void> {
        await this.log({
            userId,
            eventType: SecurityEventType.REPLAY_ATTACK_DETECTED,
            ip,
            userAgent,
            metadata: { sessionId, severity: 'CRITICAL' },
        });
    }

    /**
     * Log rate limit exceeded event.
     */
    static async logRateLimitExceeded(ip: string, userAgent: string, endpoint: string): Promise<void> {
        await this.log({
            eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
            ip,
            userAgent,
            metadata: { endpoint },
        });
    }

    /**
     * Log device trust toggle.
     */
    static async logTrustChange(userId: string, ip: string, userAgent: string, sessionId: string, isTrusted: boolean): Promise<void> {
        await this.log({
            userId,
            eventType: SecurityEventType.DEVICE_TRUST_CHANGE,
            ip,
            userAgent,
            metadata: { sessionId, isTrusted, action: isTrusted ? 'TRUST' : 'UNTRUST' },
        });
    }
}

