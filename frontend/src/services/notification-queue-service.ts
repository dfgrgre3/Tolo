import { logger } from '../lib/logger';

type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';

export type NotificationJobPayload = {
    userId: string;
    type: string;
    title: string;
    message: string;
    channels?: NotificationChannel[];
    metadata?: Record<string, unknown>;
    priority?: 'high' | 'normal' | 'low';
};

export class NotificationQueueService {
    /**
     * Enqueue a notification to be sent via multiple channels
     */
    static async enqueueNotification(
        userId: string,
        type: string,
        title: string,
        message: string,
        options?: {
            channels?: NotificationChannel[];
            metadata?: Record<string, unknown>;
            priority?: 'high' | 'normal' | 'low';
        }
    ) {
        logger.debug(`Enqueuing notification for user ${userId}: ${type} via Go API`);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications/enqueue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Auth header should be added by the caller or a central API client
                },
                body: JSON.stringify({
                    userId,
                    type,
                    title,
                    message,
                    channels: options?.channels || ['in-app'],
                    metadata: options?.metadata,
                    priority: options?.priority || 'normal',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to enqueue notification: ${response.statusText}`);
            }

            logger.info(`[NotificationQueueService] Notification enqueued successfully via Go API`);
        } catch (error) {
            logger.error(`[NotificationQueueService] Error enqueuing notification:`, error);
            // Fallback or retry logic could go here
            throw error;
        }
    }

    /**
     * @deprecated Migrated to Go backend
     */
    static async processJob(job: any): Promise<void> {
        logger.warn('[NotificationQueueService] processJob called in Next.js but logic has been migrated to Go');
    }

    /**
     * Send notification via a specific channel
     */
    private static async sendViaChannel(
        channel: NotificationChannel,
        userId: string,
        title: string,
        message: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        switch (channel) {
            case 'email':
                await this.sendEmail(userId, title, message, metadata);
                break;
            case 'sms':
                await this.sendSMS(userId, message, metadata);
                break;
            case 'push':
                await this.sendPushNotification(userId, title, message, metadata);
                break;
            case 'in-app':
                await this.sendInAppNotification(userId, title, message, metadata);
                break;
            default:
                logger.warn(`[NotificationQueueService] Unknown channel: ${channel}`);
        }
    }

    private static async sendEmail(userId: string, subject: string, body: string, metadata?: Record<string, unknown>): Promise<void> {
        // TODO: Implement email sending via Brevo SMTP
        logger.info(`[NotificationQueueService] Would send email to user ${userId}: ${subject}`);
    }

    private static async sendSMS(userId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        // TODO: Implement SMS sending via Twilio
        logger.info(`[NotificationQueueService] Would send SMS to user ${userId}`);
    }

    private static async sendPushNotification(userId: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        // TODO: Implement push notification
        logger.info(`[NotificationQueueService] Would send push notification to user ${userId}: ${title}`);
    }

    private static async sendInAppNotification(userId: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        // TODO: Implement in-app notification storage (database)
        logger.info(`[NotificationQueueService] Would store in-app notification for user ${userId}: ${title}`);
    }
}