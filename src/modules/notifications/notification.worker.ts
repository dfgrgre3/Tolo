import { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { BaseWorker } from '@/lib/queue/bullmq';
import {
  NotificationQueueService,
  type NotificationJobPayload,
} from '@/services/notification-queue-service';

export class NotificationWorker extends BaseWorker<NotificationJobPayload> {
  constructor() {
    super('notifications', {
      concurrency: 10,
    });
  }

  async process(job: Job<NotificationJobPayload, any, string>): Promise<void> {
    switch (job.name) {
      case 'SEND_MULTI_CHANNEL_NOTIFICATION':
        await NotificationQueueService.processJob(job);
        break;
      default:
        logger.warn(`[NotificationWorker] Unknown job name: ${job.name}`);
    }
  }
}

export const notificationWorker = new NotificationWorker();
export default notificationWorker;
