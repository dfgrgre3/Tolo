/**
 * 📱 QR Login Service - خدمة تسجيل الدخول عبر QR Code
 * 
 * تسمح للمستخدمين بتسجيل الدخول عن طريق مسح QR Code من جهاز آخر
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

export interface QRLoginSession {
    id: string;
    token: string;
    status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';
    createdAt: Date;
    expiresAt: Date;
    scannedAt?: Date;
    confirmedAt?: Date;
    scannedByUserId?: string;
    scannedByDevice?: string;
    browserInfo?: string;
    ipAddress?: string;
}

export interface QRLoginConfig {
    expirationSeconds: number;
    pollingIntervalMs: number;
    maxAttempts: number;
}

const DEFAULT_CONFIG: QRLoginConfig = {
    expirationSeconds: 300, // 5 minutes
    pollingIntervalMs: 2000, // 2 seconds
    maxAttempts: 3,
};

// In-memory store (use Redis in production)
const qrSessionStore = new Map<string, QRLoginSession>();

export class QRLoginService {
    private config: QRLoginConfig;

    constructor(config?: Partial<QRLoginConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Cleanup expired sessions periodically
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanupExpiredSessions(), 60000);
        }
    }

    /**
     * Generate a new QR login session
     */
    async createSession(browserInfo?: string, ipAddress?: string): Promise<QRLoginSession> {
        const id = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('base64url');

        const session: QRLoginSession = {
            id,
            token,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.expirationSeconds * 1000),
            browserInfo,
            ipAddress,
        };

        qrSessionStore.set(id, session);

        logger.info('QR login session created', { sessionId: id });

        return session;
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<QRLoginSession | null> {
        const session = qrSessionStore.get(sessionId);

        if (!session) return null;

        // Check expiration
        if (new Date() > session.expiresAt) {
            session.status = 'expired';
            qrSessionStore.set(sessionId, session);
        }

        return session;
    }

    /**
     * Mark session as scanned (mobile app scanned the QR)
     */
    async markAsScanned(
        sessionId: string,
        userId: string,
        device?: string
    ): Promise<QRLoginSession | null> {
        const session = qrSessionStore.get(sessionId);

        if (!session) {
            logger.warn('QR session not found for scanning', { sessionId });
            return null;
        }

        if (session.status !== 'pending') {
            logger.warn('QR session not in pending state', {
                sessionId,
                currentStatus: session.status
            });
            return null;
        }

        if (new Date() > session.expiresAt) {
            session.status = 'expired';
            qrSessionStore.set(sessionId, session);
            return null;
        }

        session.status = 'scanned';
        session.scannedAt = new Date();
        session.scannedByUserId = userId;
        session.scannedByDevice = device;

        qrSessionStore.set(sessionId, session);

        logger.info('QR session scanned', { sessionId, userId });

        return session;
    }

    /**
     * Confirm login (user approved on mobile)
     */
    async confirmLogin(
        sessionId: string,
        token: string,
        userId: string
    ): Promise<QRLoginSession | null> {
        const session = qrSessionStore.get(sessionId);

        if (!session) {
            logger.warn('QR session not found for confirmation', { sessionId });
            return null;
        }

        // Verify token
        if (session.token !== token) {
            logger.warn('QR session token mismatch', { sessionId });
            return null;
        }

        // Verify user
        if (session.scannedByUserId !== userId) {
            logger.warn('QR session user mismatch', { sessionId });
            return null;
        }

        if (session.status !== 'scanned') {
            logger.warn('QR session not in scanned state', {
                sessionId,
                currentStatus: session.status
            });
            return null;
        }

        if (new Date() > session.expiresAt) {
            session.status = 'expired';
            qrSessionStore.set(sessionId, session);
            return null;
        }

        session.status = 'confirmed';
        session.confirmedAt = new Date();

        qrSessionStore.set(sessionId, session);

        logger.info('QR login confirmed', { sessionId, userId });

        return session;
    }

    /**
     * Cancel a session
     */
    async cancelSession(sessionId: string): Promise<boolean> {
        const session = qrSessionStore.get(sessionId);

        if (!session) return false;

        session.status = 'cancelled';
        qrSessionStore.set(sessionId, session);

        logger.info('QR session cancelled', { sessionId });

        return true;
    }

    /**
     * Generate QR code data URL
     */
    generateQRData(session: QRLoginSession): string {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        return JSON.stringify({
            type: 'thanawy_qr_login',
            version: 1,
            sessionId: session.id,
            token: session.token,
            expiresAt: session.expiresAt.toISOString(),
            url: `${baseUrl}/auth/qr-confirm/${session.id}`,
        });
    }

    /**
     * Cleanup expired sessions
     */
    private cleanupExpiredSessions(): void {
        const now = new Date();
        let cleaned = 0;

        for (const [id, session] of qrSessionStore.entries()) {
            // Remove sessions expired more than 1 hour ago
            if (now.getTime() - session.expiresAt.getTime() > 60 * 60 * 1000) {
                qrSessionStore.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`Cleaned up ${cleaned} expired QR sessions`);
        }
    }

    /**
     * Get remaining time for session
     */
    getRemainingTime(session: QRLoginSession): number {
        const remaining = session.expiresAt.getTime() - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
    }
}

// Singleton instance
let qrLoginServiceInstance: QRLoginService | null = null;

export function getQRLoginService(): QRLoginService {
    if (!qrLoginServiceInstance) {
        qrLoginServiceInstance = new QRLoginService();
    }
    return qrLoginServiceInstance;
}

export default QRLoginService;
