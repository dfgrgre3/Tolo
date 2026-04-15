import { GamificationWorker } from '../src/services/worker/gamification-worker';
import { NotificationQueueService } from '../src/services/notification-queue-service';
import { ReferralQueueService } from '../src/services/referral-queue-service';
import { logger } from '../src/lib/logger';
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../src/lib/queue/bullmq';

/**
 * Universal Worker Runner for High Scalability
 * This script is designed to run in a separate process/container from the Next.js Frontend.
 */
async function main() {
  logger.info('🚀 Starting App Background Workers...');

  // 1. Start Specialized Workers
  await GamificationWorker.start();
  
  // 2. Start Notification Worker
  const notificationWorker = new Worker('notifications', async (job: Job) => {
    try {
      await NotificationQueueService.processJob(job);
    } catch (error) {
      logger.error(`[NotificationWorker] Job ${job.id} failed:`, error);
      throw error;
    }
  }, {
    connection: redisConnection,
    concurrency: 10, // Higher concurrency for notifications
  });

  // 3. Start Referral Worker
  const referralWorker = new Worker('referrals', async (job: Job) => {
    try {
      await ReferralQueueService.processJob(job);
    } catch (error) {
      logger.error(`[ReferralWorker] Job ${job.id} failed:`, error);
      throw error;
    }
  }, {
    connection: queueConnection,
    concurrency: 5,
  });

  logger.info('✅ All workers are online and listening to Redis.');

  // Handle termination signals for graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down workers...`);
    await GamificationWorker.stop();
    await notificationWorker.close();
    await referralWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start App Workers:', error);
  process.exit(1);
});
