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
  metadata?: Record<string, any>;
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

  private constructor() {}

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
    metadata?: Record<string, any>
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
    metadata?: Record<string, any>
  ): {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  } {
    switch (type) {
      case 'new_device_login':
        return {
          title: 'طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظ…ظ† ط¬ظ‡ط§ط² ط¬ط¯ظٹط¯',
          message: `طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ط­ط³ط§ط¨ظƒ ظ…ظ† ط¬ظ‡ط§ط² ط¬ط¯ظٹط¯ (${metadata?.device?.browser} ط¹ظ„ظ‰ ${metadata?.device?.os})${metadata?.location ? ` ظ…ظ† ${metadata.location.city || metadata.location.country}` : ''}.`,
          severity: 'warning',
        };

      case 'new_location_login':
        return {
          title: 'طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظ…ظ† ظ…ظˆظ‚ط¹ ط¬ط¯ظٹط¯',
          message: `طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ط­ط³ط§ط¨ظƒ ظ…ظ† ظ…ظˆظ‚ط¹ ط¬ط¯ظٹط¯: ${metadata?.location?.city || metadata?.location?.country || 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}.`,
          severity: 'warning',
        };

      case 'suspicious_login':
        return {
          title: 'ظ…ط­ط§ظˆظ„ط© طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظ…ط´ط¨ظˆظ‡ط©',
          message: `طھظ… ط§ظƒطھط´ط§ظپ ظ…ط­ط§ظˆظ„ط© طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظ…ط´ط¨ظˆظ‡ط© ظ„ط­ط³ط§ط¨ظƒ. ظ…ط³طھظˆظ‰ ط§ظ„ط®ط·ط±: ${metadata?.riskLevel}. ط¥ط°ط§ ظ„ظ… طھظƒظ† ط£ظ†طھطŒ ظ‚ظ… ط¨طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظپظˆط±ط§ظ‹.`,
          severity: 'critical',
        };

      case 'password_changed':
        return {
          title: 'طھظ… طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±',
          message: 'طھظ… طھط؛ظٹظٹط± ظƒظ„ظ…ط© ظ…ط±ظˆط± ط­ط³ط§ط¨ظƒ ط¨ظ†ط¬ط§ط­. ط¥ط°ط§ ظ„ظ… طھظ‚ظ… ط¨ط°ظ„ظƒطŒ ط§طھطµظ„ ط¨ط§ظ„ط¯ط¹ظ… ظپظˆط±ط§ظ‹.',
          severity: 'critical',
        };

      case 'email_changed':
        return {
          title: 'طھظ… طھط؛ظٹظٹط± ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',
          message: 'طھظ… طھط؛ظٹظٹط± ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ط­ط³ط§ط¨ظƒ. ط¥ط°ط§ ظ„ظ… طھظ‚ظ… ط¨ط°ظ„ظƒطŒ ط§طھطµظ„ ط¨ط§ظ„ط¯ط¹ظ… ظپظˆط±ط§ظ‹.',
          severity: 'critical',
        };

      case '2fa_enabled':
        return {
          title: 'طھظ… طھظپط¹ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط«ظ†ط§ط¦ظٹط©',
          message: 'طھظ… طھظپط¹ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط«ظ†ط§ط¦ظٹط© ظ„ط­ط³ط§ط¨ظƒ. ط­ط³ط§ط¨ظƒ ط§ظ„ط¢ظ† ط£ظƒط«ط± ط£ظ…ط§ظ†ط§ظ‹.',
          severity: 'info',
        };

      case '2fa_disabled':
        return {
          title: 'طھظ… طھط¹ط·ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط«ظ†ط§ط¦ظٹط©',
          message: 'طھظ… طھط¹ط·ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط«ظ†ط§ط¦ظٹط© ظ„ط­ط³ط§ط¨ظƒ. ظ†ظˆطµظٹ ط¨ط¥ط¹ط§ط¯ط© طھظپط¹ظٹظ„ظ‡ط§ ظ„ط­ظ…ط§ظٹط© ط£ظپط¶ظ„.',
          severity: 'warning',
        };

      case 'device_removed':
        return {
          title: 'طھظ… ط¥ط²ط§ظ„ط© ط¬ظ‡ط§ط²',
          message: 'طھظ… ط¥ط²ط§ظ„ط© ط¬ظ‡ط§ط² ظ…ظ† ط§ظ„ط£ط¬ظ‡ط²ط© ط§ظ„ظ…ظˆط«ظˆظ‚ط© ظ„ط­ط³ط§ط¨ظƒ.',
          severity: 'info',
        };

      case 'multiple_failed_attempts':
        return {
          title: 'ظ…ط­ط§ظˆظ„ط§طھ ط¯ط®ظˆظ„ ظپط§ط´ظ„ط© ظ…طھط¹ط¯ط¯ط©',
          message: `طھظ… ط±طµط¯ ${metadata?.attemptCount || 'ط¹ط¯ط©'} ظ…ط­ط§ظˆظ„ط§طھ ظپط§ط´ظ„ط© ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ط­ط³ط§ط¨ظƒ. ط¥ط°ط§ ظ„ظ… طھظƒظ† ط£ظ†طھطŒ ظ‚ظ… ط¨طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±.`,
          severity: 'warning',
        };

      case 'account_locked':
        return {
          title: 'طھظ… ظ‚ظپظ„ ط§ظ„ط­ط³ط§ط¨ ظ…ط¤ظ‚طھط§ظ‹',
          message: 'طھظ… ظ‚ظپظ„ ط­ط³ط§ط¨ظƒ ظ…ط¤ظ‚طھط§ظ‹ ط¨ط³ط¨ط¨ ظ…ط­ط§ظˆظ„ط§طھ طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظ…ط´ط¨ظˆظ‡ط©. ط³ظٹطھظ… ط¥ظ„ط؛ط§ط، ط§ظ„ظ‚ظپظ„ ط®ظ„ط§ظ„ 30 ط¯ظ‚ظٹظ‚ط©.',
          severity: 'critical',
        };

      case 'unusual_activity':
        return {
          title: 'ظ†ط´ط§ط· ط؛ظٹط± ظ…ط¹طھط§ط¯',
          message: 'طھظ… ط±طµط¯ ظ†ط´ط§ط· ط؛ظٹط± ظ…ط¹طھط§ط¯ ط¹ظ„ظ‰ ط­ط³ط§ط¨ظƒ. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط³ط¬ظ„ ط§ظ„ظ†ط´ط§ط·ط§طھ.',
          severity: 'warning',
        };

      default:
        return {
          title: 'ط¥ط´ط¹ط§ط± ط£ظ…ظ†ظٹ',
          message: 'طھظ… ط±طµط¯ ط­ط¯ط« ط£ظ…ظ†ظٹ ط¹ظ„ظ‰ ط­ط³ط§ط¨ظƒ.',
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
        ip: notification.metadata?.ip || 'unknown',
        userAgent: notification.metadata?.userAgent || 'system',
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
            ${notification.metadata?.device || notification.metadata?.location || notification.metadata?.ip ? `
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #374151; margin-top: 0; margin-bottom: 10px; font-size: 14px;">طھظپط§طµظٹظ„ ط§ظ„ط­ط¯ط«:</h3>
                ${notification.metadata?.device ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط§ظ„ط¬ظ‡ط§ط²:</strong> ${notification.metadata.device.browser || ''} ط¹ظ„ظ‰ ${notification.metadata.device.os || ''}</p>` : ''}
                ${notification.metadata?.location ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط§ظ„ظ…ظˆظ‚ط¹:</strong> ${notification.metadata.location.city || notification.metadata.location.country || 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}</p>` : ''}
                ${notification.metadata?.ip ? `<p style="color: #6b7280; margin: 5px 0; font-size: 13px;"><strong>ط¹ظ†ظˆط§ظ† IP:</strong> ${notification.metadata.ip}</p>` : ''}
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

