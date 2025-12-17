/**
 * Security Notifications Service
 * ظ†ط¸ط§ظ… ط°ظƒظٹ ظ„ظ„ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ط£ظ…ظ†ظٹط©
 */

import { prisma } from '@/lib/db';
import { RiskAssessment } from './risk-assessment';
import { DeviceFingerprint } from './device-fingerprint';

import { logger } from '@/lib/logger';

export interface SecurityNotification {
  id: string;
  userId: string;
  type: SecurityNotificationType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  actioned: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export type SecurityNotificationType =
  | 'new_device_login'
  | 'new_location_login'
  | 'suspicious_login'
  | 'password_changed'
  | 'email_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'device_removed'
  | 'multiple_failed_attempts'
  | 'account_locked'
  | 'unusual_activity';

export class SecurityNotificationService {
  private static instance: SecurityNotificationService;

  private constructor() { }

  public static getInstance(): SecurityNotificationService {
    if (!SecurityNotificationService.instance) {
      SecurityNotificationService.instance = new SecurityNotificationService();
    }
    return SecurityNotificationService.instance;
  }

  /**
   * Create a security notification
   */
  async createNotification(
    userId: string,
    type: SecurityNotificationType,
    metadata?: Record<string, unknown>
  ): Promise<SecurityNotification> {
    const { title, message, severity } = this.getNotificationContent(type, metadata);

    const notification: SecurityNotification = {
      id: crypto.randomUUID(),
      userId,
      type,
      severity,
      title,
      message,
      metadata,
      read: false,
      actioned: false,
      createdAt: new Date(),
    };

    // Store in database
    // For now, we'll log to security logs
    await this.logSecurityNotification(notification);

    // Send real-time notification if needed
    await this.sendRealTimeNotification(userId, notification);

    // Send email for critical and warning notifications
    // Critical: always send
    // Warning: send for important security events
    // Info: don't send by default
    const shouldSendEmail =
      severity === 'critical' ||
      (severity === 'warning' && ['new_device_login', 'new_location_login', 'multiple_failed_attempts', 'suspicious_login'].includes(type));

    if (shouldSendEmail) {
      await this.sendEmailNotification(userId, notification);
    }

    return notification;
  }

  /**
   * Notify about new device login
   */
  async notifyNewDeviceLogin(
    userId: string,
    device: DeviceFingerprint,
    ip: string,
    location?: { country?: string; city?: string }
  ): Promise<void> {
    await this.createNotification(userId, 'new_device_login', {
      device: {
        browser: device.browser,
        os: device.os,
        type: device.device,
      },
      ip,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about new location login
   */
  async notifyNewLocationLogin(
    userId: string,
    location: { country?: string; city?: string },
    ip: string
  ): Promise<void> {
    await this.createNotification(userId, 'new_location_login', {
      location,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about suspicious login attempt
   */
  async notifySuspiciousLogin(
    userId: string,
    riskAssessment: RiskAssessment,
    ip: string
  ): Promise<void> {
    await this.createNotification(userId, 'suspicious_login', {
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      factors: riskAssessment.factors,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about password change
   */
  async notifyPasswordChanged(userId: string, ip: string): Promise<void> {
    await this.createNotification(userId, 'password_changed', {
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about 2FA status change
   */
  async notify2FAStatusChange(
    userId: string,
    enabled: boolean,
    ip: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      enabled ? '2fa_enabled' : '2fa_disabled',
      {
        ip,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Notify about multiple failed login attempts
   */
  async notifyMultipleFailedAttempts(
    userId: string,
    attemptCount: number,
    ip: string
  ): Promise<void> {
    await this.createNotification(userId, 'multiple_failed_attempts', {
      attemptCount,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      type?: SecurityNotificationType;
    }
  ): Promise<SecurityNotification[]> {
    // Query from database
    // For now, return empty array
    return [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Update in database
  }

  /**
   * Mark notification as actioned
   */
  async markAsActioned(notificationId: string, userId: string): Promise<void> {
    // Update in database
  }

  /**
   * Get notification content based on type
   */
  private getNotificationContent(
    type: SecurityNotificationType,
    metadata?: Record<string, unknown>
  ): {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  } {
    switch (type) {
      case 'new_device_login':
        return {
          title: 'تسجيل دخول من جهاز جديد',
          message: `تم تسجيل الدخول إلى حسابك من جهاز جديد (${(metadata as any)?.device?.browser} على ${(metadata as any)?.device?.os})${(metadata as any)?.location ? ` من ${(metadata as any).location.city || (metadata as any).location.country}` : ''}.`,
          severity: 'warning',
        };

      case 'new_location_login':
        return {
          title: 'تسجيل دخول من موقع جديد',
          message: `تم تسجيل الدخول إلى حسابك من موقع جديد: ${(metadata as any)?.location?.city || (metadata as any)?.location?.country || 'غير معروف'}.`,
          severity: 'warning',
        };

      case 'suspicious_login':
        return {
          title: 'محاولة تسجيل دخول مشبوهة',
          message: `تم اكتشاف محاولة تسجيل دخول مشبوهة لحسابك. مستوى الخطر: ${(metadata as any)?.riskLevel}. إذا لم تكن أنت، قم بتغيير كلمة المرور فوراً.`,
          severity: 'critical',
        };

      case 'password_changed':
        return {
          title: 'تم تغيير كلمة المرور',
          message: 'تم تغيير كلمة مرور حسابك بنجاح. إذا لم تقم بذلك، اتصل بالدعم فوراً.',
          severity: 'critical',
        };

      case 'email_changed':
        return {
          title: 'تم تغيير البريد الإلكتروني',
          message: 'تم تغيير البريد الإلكتروني لحسابك. إذا لم تقم بذلك، اتصل بالدعم فوراً.',
          severity: 'critical',
        };

      case '2fa_enabled':
        return {
          title: 'تم تفعيل المصادقة الثنائية',
          message: 'تم تفعيل المصادقة الثنائية لحسابك. حسابك الآن أكثر أماناً.',
          severity: 'info',
        };

      case '2fa_disabled':
        return {
          title: 'تم تعطيل المصادقة الثنائية',
          message: 'تم تعطيل المصادقة الثنائية لحسابك. نوصي بإعادة تفعيلها لحماية أفضل.',
          severity: 'warning',
        };

      case 'device_removed':
        return {
          title: 'تم إزالة جهاز',
          message: 'تم إزالة جهاز من الأجهزة الموثوقة لحسابك.',
          severity: 'info',
        };

      case 'multiple_failed_attempts':
        return {
          title: 'محاولات دخول فاشلة متعددة',
          message: `تم رصد ${(metadata as any)?.attemptCount || 'عدة'} محاولات فاشلة لتسجيل الدخول إلى حسابك. إذا لم تكن أنت، قم بتغيير كلمة المرور.`,
          severity: 'warning',
        };

      case 'account_locked':
        return {
          title: 'تم قفل الحساب مؤقتاً',
          message: 'تم قفل حسابك مؤقتاً بسبب محاولات تسجيل دخول مشبوهة. سيتم إلغاء القفل خلال 30 دقيقة.',
          severity: 'critical',
        };

      case 'unusual_activity':
        return {
          title: 'نشاط غير معتاد',
          message: 'تم رصد نشاط غير معتاد على حسابك. يرجى مراجعة سجل النشاطات.',
          severity: 'warning',
        };

      default:
        return {
          title: 'إشعار أمني',
          message: 'تم رصد حدث أمني على حسابك.',
          severity: 'info',
        };
    }
  }

  /**
   * Log notification to security logs
   */
  private async logSecurityNotification(
    notification: SecurityNotification
  ): Promise<void> {
    await prisma.securityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: notification.userId,
        eventType: `notification_${notification.type}`,
        ip: (notification.metadata as any)?.ip || 'unknown',
        userAgent: (notification.metadata as any)?.userAgent || 'system',
        metadata: JSON.stringify({
          notificationId: notification.id,
          severity: notification.severity,
          title: notification.title,
          ...notification.metadata,
        }),
      },
    });
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(
    userId: string,
    notification: SecurityNotification
  ): Promise<void> {
    // Integration with WebSocket service
    // This would broadcast to all active user sessions
    try {
      // await websocketService.sendToUser(userId, {
      //   type: 'security_notification',
      //   data: notification,
      // });
    } catch (error) {
      logger.error('Failed to send real-time notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    notification: SecurityNotification
  ): Promise<void> {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailNotifications: true },
      });

      if (!user || !user.email) return;

      // Check if user has email notifications enabled
      if (user.emailNotifications === false) {
        return; // User disabled email notifications
      }

      // Import email notification service
      const { sendEmailNotification } = await import('@/lib/notification-sender-new');

      // Determine email severity color
      const severityColors = {
        info: '#3b82f6',
        warning: '#f59e0b',
        critical: '#ef4444',
      };

      const color = severityColors[notification.severity] || '#3b82f6';

      // Send email
      await sendEmailNotification({
        to: user.email,
        subject: `ًں”’ ${notification.title}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #3b82f6; margin: 0;">ط«ظ†ط§ظˆظٹ</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-right: 4px solid ${color};">
              <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">${notification.title}</h2>
              <p style="color: #4b5563; margin: 0; line-height: 1.6;">${notification.message}</p>
            </div>
            ${(notification.metadata as any)?.device || (notification.metadata as any)?.location || (notification.metadata as any)?.ip ? `
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #374151; margin-top: 0; margin-bottom: 10px; font-size: 14px;">طھظپط§طµظٹظ„ ط§ظ„ط­ط¯ط«:</h3>
                ${(notification.metadata as any)?.device ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط§ظ„ط¬ظ‡ط§ط²:</strong> ${(notification.metadata as any).device.browser || ''} ط¹ظ„ظ‰ ${(notification.metadata as any).device.os || ''}</p>` : ''}
                ${(notification.metadata as any)?.location ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط§ظ„ظ…ظˆظ‚ط¹:</strong> ${(notification.metadata as any).location.city || (notification.metadata as any).location.country || 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}</p>` : ''}
                ${(notification.metadata as any)?.ip ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط¹ظ†ظˆط§ظ† IP:</strong> ${(notification.metadata as any).ip}</p>` : ''}
                <p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط§ظ„ظˆظ‚طھ:</strong> ${new Date(notification.createdAt).toLocaleString('ar-EG')}</p>
              </div>
            ` : ''}
            ${notification.severity === 'critical' ? `
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-right: 4px solid #ef4444;">
                <p style="color: #991b1b; margin: 0; font-weight: bold; font-size: 14px;">âڑ ï¸ڈ ط¥ط¬ط±ط§ط، ط¹ط§ط¬ظ„ ظ…ط·ظ„ظˆط¨</p>
                <p style="color: #991b1b; margin: 5px 0 0 0; font-size: 13px;">ط¥ط°ط§ ظ„ظ… طھظ‚ظ… ط¨ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط،طŒ ظٹط±ط¬ظ‰ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¯ط¹ظ… ظپظˆط±ط§ظ‹.</p>
              </div>
            ` : ''}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thanawy.com'}/settings/security" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">ظ…ط±ط§ط¬ط¹ط© ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط£ظ…ط§ظ†</a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>طھظ… ط¥ط±ط³ط§ظ„ ظ‡ط°ظ‡ ط§ظ„ط±ط³ط§ظ„ط© ظ…ظ† ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©</p>
              <p>آ© ${new Date().getFullYear()} ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ‚ ظ…ط­ظپظˆط¸ط©</p>
            </div>
          </div>
        `,
        text: `${notification.title}\n\n${notification.message}\n\nط§ظ„ظˆظ‚طھ: ${new Date(notification.createdAt).toLocaleString('ar-EG')}`,
      });
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      // Don't throw - we don't want to break the main flow if email fails
    }
  }
}

export const securityNotificationService = SecurityNotificationService.getInstance();

