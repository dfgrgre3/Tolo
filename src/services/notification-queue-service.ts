import { Job } from 'bullmq';
import { logger } from '../lib/logger';
import { notificationQueue } from '../lib/queue/bullmq';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';

export type NotificationJobPayload = {
    userId: string;
    type: string;
    title: string;
    message: string;
    channels?: NotificationChannel[];
    metadata?: Record<string, any>;
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
            metadata?: Record<string, any>;
            priority?: 'high' | 'normal' | 'low';
        }
    ) {
        logger.debug(`Enqueuing notification for user ${userId}: ${type}`);

        await notificationQueue.addJob('SEND_MULTI_CHANNEL_NOTIFICATION', {
            userId,
            type,
            title,
            message,
            channels: options?.channels || ['in-app'],
            metadata: options?.metadata,
            priority: options?.priority || 'normal',
        });
    }

    /**
     * Process a notification job (called by the worker)
     */
    static async processJob(job: Job<NotificationJobPayload, any, string>): Promise<void> {
        const { userId, type, title, message, channels, metadata, priority } = job.data;

        logger.info(`[NotificationQueueService] Processing notification for user ${userId}`, {
            type,
            title,
            channels,
            priority,
        });

        try {
            // Process each channel
            const results = await Promise.allSettled(
                (channels || ['in-app']).map((channel) => this.sendViaChannel(channel, userId, title, message, metadata))
            );

            // Log any failures
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    logger.error(`[NotificationQueueService] Failed to send via ${channels?.[index]}:`, result.reason);
                }
            });

            logger.info(`[NotificationQueueService] Notification sent successfully to user ${userId}`);
        } catch (error) {
            logger.error(`[NotificationQueueService] Error processing notification job ${job.id}:`, error);
            throw error;
        }
    }

    /**
     * Send notification via a specific channel
     */
    private static async sendViaChannel(
        channel: NotificationChannel,
        userId: string,
        title: string,
        message: string,
        metadata?: Record<string, any>
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

    private static async sendEmail(userId: string, subject: string, body: string, metadata?: Record<string, any>): Promise<void> {
        // TODO: Implement email sending via Brevo SMTP
        logger.info(`[NotificationQueueService] Would send email to user ${userId}: ${subject}`);
    }

    private static async sendSMS(userId: string, message: string, metadata?: Record<string, any>): Promise<void> {
        // TODO: Implement SMS sending via Twilio
        logger.info(`[NotificationQueueService] Would send SMS to user ${userId}`);
    }

    private static async sendPushNotification(userId: string, title: string, message: string, metadata?: Record<string, any>): Promise<void> {
        // TODO: Implement push notification
        logger.info(`[NotificationQueueService] Would send push notification to user ${userId}: ${title}`);
    }

    private static async sendInAppNotification(userId: string, title: string, message: string, metadata?: Record<string, any>): Promise<void> {
        // TODO: Implement in-app notification storage (database)
        logger.info(`[NotificationQueueService] Would store in-app notification for user ${userId}: ${title}`);
    }
}