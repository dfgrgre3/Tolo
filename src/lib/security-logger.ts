/**
 * Security Logger - Consolidated Wrapper
 * Provides structured logging for security events via the Unified Logger.
 * Maintains compatibility with existing code while centralizing logging.
 */

import { logger } from './logger';
import { prisma } from './db';
import { DeviceInfo, SecurityMetadata } from '@/types/services';
import { SecurityEventType, SecurityLogData, saveSecurityEventToDB } from './logging/db-security-log';

export { type SecurityEventType, type SecurityLogData };

/**
 * خدمة تسجيل الأحداث الأمنية الموحدة
 */
export class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() { }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * تسجيل حدث أمني عبر النظام الموحد
   */
  async logEvent(data: SecurityLogData): Promise<void> {
    // We call logger.security which will automatically handle:
    // 1. Console logging
    // 2. ELK transport
    // 3. Database save (via the internal logToSecurityLogger transport)
    logger.security({
      eventType: data.eventType,
      userId: data.userId || 'unknown',
      ip: data.ip,
      userAgent: data.userAgent,
      metadata: {
        deviceInfo: data.deviceInfo,
        location: data.location,
        ...data.metadata
      }
    });
  }

  // --- Convenience Methods ---

  async logLoginSuccess(userId: string, ip: string, userAgent: string, deviceInfo?: DeviceInfo, location?: string): Promise<void> {
    await this.logEvent({ userId, eventType: 'LOGIN_SUCCESS', ip, userAgent, deviceInfo, location });
  }

  async logLoginFailed(userId: string | null, ip: string, userAgent: string, reason?: string, deviceInfo?: DeviceInfo): Promise<void> {
    await this.logEvent({ userId: userId || 'unknown', eventType: 'LOGIN_FAILED', ip, userAgent, deviceInfo, metadata: { reason } });
  }

  async logLogout(userId: string, ip: string, userAgent: string, metadata?: SecurityMetadata): Promise<void> {
    await this.logEvent({ userId, eventType: 'LOGOUT', ip, userAgent, metadata });
  }

  async logPasswordChanged(userId: string, ip: string, userAgent: string): Promise<void> {
    await this.logEvent({ userId, eventType: 'PASSWORD_CHANGED', ip, userAgent });
  }

  async logPasswordResetRequested(userId: string, ip: string, userAgent: string): Promise<void> {
    await this.logEvent({ userId, eventType: 'PASSWORD_RESET_REQUESTED', ip, userAgent });
  }

  async logTwoFactorToggle(userId: string, enabled: boolean, ip: string, userAgent: string): Promise<void> {
    await this.logEvent({ userId, eventType: enabled ? 'TWO_FACTOR_ENABLED' : 'TWO_FACTOR_DISABLED', ip, userAgent });
  }

  async logSuspiciousActivity(userId: string, ip: string, userAgent: string, reason: string, deviceInfo?: DeviceInfo, location?: string): Promise<void> {
    await this.logEvent({ userId, eventType: 'SUSPICIOUS_ACTIVITY_DETECTED', ip, userAgent, deviceInfo, location, metadata: { reason } });
  }

  async logSessionEvent(userId: string, eventType: 'SESSION_CREATED' | 'SESSION_REVOKED' | 'SESSION_EXPIRED', ip: string, userAgent: string, sessionId?: string): Promise<void> {
    await this.logEvent({ userId, eventType, ip, userAgent, metadata: { sessionId } });
  }

  // --- Database Retrieval Methods ---

  async getUserSecurityLogs(userId: string, limit: number = 50, offset: number = 0): Promise<SecurityLogData[]> {
    try {
      const logs = await prisma.securityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs.map((log: any) => ({
        ...log,
        eventType: log.eventType as SecurityEventType,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get security logs from DB', error, { userId });
      return [];
    }
  }

  async getLogsByEventType(userId: string, eventType: SecurityEventType, limit: number = 50): Promise<SecurityLogData[]> {
    try {
      const logs = await prisma.securityLog.findMany({
        where: { userId, eventType },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((log: any) => ({
        ...log,
        eventType: log.eventType as SecurityEventType,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get security logs by type from DB', error, { userId, eventType });
      return [];
    }
  }

  async getLastEventOfType(userId: string, eventType: SecurityEventType): Promise<SecurityLogData | null> {
    try {
      const log = await prisma.securityLog.findFirst({
        where: { userId, eventType },
        orderBy: { createdAt: 'desc' },
      });

      if (!log) return null;

      return {
        ...log,
        eventType: log.eventType as SecurityEventType,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      };
    } catch (error) {
      logger.error('Failed to get last security event from DB', error, { userId, eventType });
      return null;
    }
  }
}

export const securityLogger = SecurityLogger.getInstance();
