import { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { notificationQueue } from '@/lib/queue/bullmq';
import {
  sendMultiChannelNotification,
  type MultiChannelNotificationOptions,
  type MultiChannelNotificationResult,
} from '@/services/notification-sender';

export type NotificationJobPayload = MultiChannelNotificationOptions & {
  idempotencyKey?: string;
};

export class NotificationQueueService {
  /**
   * Enqueue a notification job with robust deduplication (jobId).
   */
  static async enqueue(
    payload: NotificationJobPayload,
    options?: { jobId?: string; priority?: number }
  ) {
    // 1. Determine the jobId for deduplication (Prefer explicit jobId, then payload key)
    const jobId = options?.jobId ?? payload.idempotencyKey;
    
    // 2. Secondary Atomic Guard: Prevent rapid duplicate enqueues for same specific job
    // This handles race conditions where multiple requests might try to enqueue before BullMQ's internal state is updated.
    const guardKey = `notification_guard:${jobId || `${payload.userId}:${payload.type}`}`;
    
    try {
        const { getRedisClient } = await import('@/lib/cache');
        const redis = await getRedisClient();
        
        if (redis && redis.status === 'ready') {
            const isDuplicate = await redis.set(guardKey, 'LOCKED', 'EX', 10, 'NX');
            if (!isDuplicate) {
                logger.warn(`[NotificationQueue] Blocking rapid duplicate enqueue for user ${payload.userId}`, { jobId, guardKey });
                return null;
            }
        }
    } catch (e) {
        logger.warn('[NotificationQueue] Guard check failed, proceeding with standard BullMQ dedup', { error: e });
    }

    logger.info(`[NotificationQueue] Enqueuing job for user ${payload.userId}`, { 
        jobId, 
        type: payload.type,
        hasIdempotencyKey: !!payload.idempotencyKey 
    });

    try {
        const job = await notificationQueue.addJob('SEND_MULTI_CHANNEL_NOTIFICATION', payload, { 
          jobId,
          priority: options?.priority
        });

        if (job) {
            logger.debug(`[NotificationQueue] Job ${job.id} enqueued successfully`, { jobId });
        } else {
            logger.info(`[NotificationQueue] Job deduplicated by BullMQ`, { jobId });
        }

        return job;
    } catch (error) {
        logger.error(`[NotificationQueue] Failed to enqueue job for user ${payload.userId}`, { error, jobId });
        throw error;
    }
  }

  /**
   * Process a notification job.
   */
  static async processJob(job: Job<NotificationJobPayload, any, string>): Promise<MultiChannelNotificationResult> {
    const { data } = job;
    logger.info(`[NotificationQueue] Processing job ${job.id} for user ${data.userId} [Type: ${data.channels?.join(',') || 'app'}]`);
    
    try {
      return await sendMultiChannelNotification(data);
    } catch (error) {
      logger.error(`[NotificationQueue] Failed to process job ${job.id}:`, error);
      throw error; // Rethrow to allow BullMQ retries
    }
  }
}

export default NotificationQueueService;
