import { prisma } from '../db';

export type SecurityEventType =
    | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGIN_ATTEMPT_BLOCKED'
    | 'LOGOUT' | 'LOGOUT_ALL' | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED'
    | 'EMAIL_VERIFIED' | 'EMAIL_VERIFICATION_SENT'
    | 'TWO_FACTOR_ENABLED' | 'TWO_FACTOR_DISABLED' | 'TWO_FACTOR_SETUP'
    | 'TWO_FACTOR_REQUESTED' | 'TWO_FACTOR_SUCCESS' | 'TWO_FACTOR_FAILED'
    | 'RECOVERY_CODES_REGENERATED' | 'BIOMETRIC_ENABLED' | 'BIOMETRIC_DISABLED'
    | 'BIOMETRIC_LOGIN_SUCCESS' | 'BIOMETRIC_LOGIN_FAILED'
    | 'SESSION_CREATED' | 'SESSION_REVOKED' | 'SESSION_EXPIRED'
    | 'SUSPICIOUS_ACTIVITY_DETECTED' | 'ACCOUNT_LOCKED' | 'ACCOUNT_UNLOCKED'
    | 'IP_WHITELIST_ADDED' | 'IP_WHITELIST_REMOVED' | 'SECURITY_SETTINGS_CHANGED'
    | 'MAGIC_LINK_SENT' | 'MAGIC_LINK_USED';

export interface SecurityLogData {
    userId: string | null;
    eventType: SecurityEventType;
    ip: string;
    userAgent: string;
    deviceInfo?: any;
    location?: string | null;
    metadata?: any;
}

/**
 * Saves a security event directly to the database.
 * This should only be called from server-side code.
 */
export async function saveSecurityEventToDB(data: SecurityLogData): Promise<void> {
    if (typeof window !== 'undefined') return;

    try {
        await prisma.securityLog.create({
            data: {
                id: crypto.randomUUID(),
                userId: data.userId,
                eventType: data.eventType,
                ip: data.ip,
                userAgent: data.userAgent,
                deviceInfo: data.deviceInfo ? (typeof data.deviceInfo === 'string' ? data.deviceInfo : JSON.stringify(data.deviceInfo)) : null,
                location: data.location || null,
                metadata: data.metadata ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) : null,
            },
        });
    } catch (error) {
        // We don't throw to avoid disrupting the main flow
        console.error('CRITICAL: Failed to save security event to database', error);
    }
}
