import { prisma } from './prisma';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_ATTEMPT_BLOCKED'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_VERIFIED'
  | 'EMAIL_VERIFICATION_SENT'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'TWO_FACTOR_SETUP'
  | 'TWO_FACTOR_REQUESTED'
  | 'TWO_FACTOR_SUCCESS'
  | 'TWO_FACTOR_FAILED'
  | 'RECOVERY_CODES_REGENERATED'
  | 'BIOMETRIC_ENABLED'
  | 'BIOMETRIC_DISABLED'
  | 'BIOMETRIC_LOGIN_SUCCESS'
  | 'BIOMETRIC_LOGIN_FAILED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'SUSPICIOUS_ACTIVITY_DETECTED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'IP_WHITELIST_ADDED'
  | 'IP_WHITELIST_REMOVED'
  | 'SECURITY_SETTINGS_CHANGED'
  | 'MAGIC_LINK_SENT'
  | 'MAGIC_LINK_USED';

export interface SecurityLogData {
  userId: string;
  eventType: SecurityEventType;
  ip: string;
  userAgent: string;
  deviceInfo?: any;
  location?: string;
  metadata?: any;
}

/**
 * خدمة تسجيل الأحداث الأمنية
 */
export class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * تسجيل حدث أمني
   */
  async logEvent(data: SecurityLogData): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: data.userId,
          eventType: data.eventType,
          ip: data.ip,
          userAgent: data.userAgent,
          deviceInfo: data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
          location: data.location || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });
    } catch (error) {
      // لا نرمي خطأ حتى لا نؤثر على التدفق الرئيسي
      // لكن نسجله في console في وضع التطوير
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log security event:', error);
      }
    }
  }

  /**
   * تسجيل محاولة تسجيل دخول ناجحة
   */
  async logLoginSuccess(
    userId: string,
    ip: string,
    userAgent: string,
    deviceInfo?: any,
    location?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'LOGIN_SUCCESS',
      ip,
      userAgent,
      deviceInfo,
      location,
    });
  }

  /**
   * تسجيل محاولة تسجيل دخول فاشلة
   */
  async logLoginFailed(
    userId: string | null,
    ip: string,
    userAgent: string,
    reason?: string,
    deviceInfo?: any
  ): Promise<void> {
    await this.logEvent({
      userId: userId || 'unknown',
      eventType: 'LOGIN_FAILED',
      ip,
      userAgent,
      deviceInfo,
      metadata: { reason },
    });
  }

  /**
   * تسجيل تسجيل خروج
   */
  async logLogout(
    userId: string,
    ip: string,
    userAgent: string,
    metadata?: any
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'LOGOUT',
      ip,
      userAgent,
      metadata,
    });
  }

  /**
   * تسجيل تغيير كلمة المرور
   */
  async logPasswordChanged(
    userId: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'PASSWORD_CHANGED',
      ip,
      userAgent,
    });
  }

  /**
   * تسجيل طلب إعادة تعيين كلمة المرور
   */
  async logPasswordResetRequested(
    userId: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'PASSWORD_RESET_REQUESTED',
      ip,
      userAgent,
    });
  }

  /**
   * تسجيل تفعيل/إلغاء المصادقة الثنائية
   */
  async logTwoFactorToggle(
    userId: string,
    enabled: boolean,
    ip: string,
    userAgent: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: enabled ? 'TWO_FACTOR_ENABLED' : 'TWO_FACTOR_DISABLED',
      ip,
      userAgent,
    });
  }

  /**
   * تسجيل نشاط مشبوه
   */
  async logSuspiciousActivity(
    userId: string,
    ip: string,
    userAgent: string,
    reason: string,
    deviceInfo?: any,
    location?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'SUSPICIOUS_ACTIVITY_DETECTED',
      ip,
      userAgent,
      deviceInfo,
      location,
      metadata: { reason },
    });
  }

  /**
   * تسجيل إنشاء/إنهاء جلسة
   */
  async logSessionEvent(
    userId: string,
    eventType: 'SESSION_CREATED' | 'SESSION_REVOKED' | 'SESSION_EXPIRED',
    ip: string,
    userAgent: string,
    sessionId?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType,
      ip,
      userAgent,
      metadata: { sessionId },
    });
  }

  /**
   * الحصول على سجلات الأمان للمستخدم
   */
  async getUserSecurityLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const logs = await prisma.securityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs.map((log) => ({
        ...log,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
    } catch (error) {
      console.error('Failed to get security logs:', error);
      return [];
    }
  }

  /**
   * الحصول على سجلات نوع معين من الأحداث
   */
  async getLogsByEventType(
    userId: string,
    eventType: SecurityEventType,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const logs = await prisma.securityLog.findMany({
        where: {
          userId,
          eventType,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((log) => ({
        ...log,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
    } catch (error) {
      console.error('Failed to get logs by event type:', error);
      return [];
    }
  }

  /**
   * الحصول على آخر حدث من نوع معين
   */
  async getLastEventOfType(
    userId: string,
    eventType: SecurityEventType
  ): Promise<any | null> {
    try {
      const log = await prisma.securityLog.findFirst({
        where: {
          userId,
          eventType,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!log) return null;

      return {
        ...log,
        deviceInfo: log.deviceInfo ? JSON.parse(log.deviceInfo) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      };
    } catch (error) {
      console.error('Failed to get last event:', error);
      return null;
    }
  }
}

export const securityLogger = SecurityLogger.getInstance();

