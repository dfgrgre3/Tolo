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
  static async enqueue(
    payload: NotificationJobPayload,
    options?: { jobId?: string }
  ) {
    const jobId = options?.jobId ?? payload.idempotencyKey;
    return notificationQueue.addJob('SEND_MULTI_CHANNEL_NOTIFICATION', payload, jobId);
  }

  static async processJob(job: Job<NotificationJobPayload, any, string>): Promise<MultiChannelNotificationResult> {
    const { data } = job;
    logger.info(`[NotificationQueue] Processing job ${job.id} for user ${data.userId}`);
    return sendMultiChannelNotification(data);
  }
}

export default NotificationQueueService;
