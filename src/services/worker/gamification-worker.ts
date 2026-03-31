import { Worker, Job } from 'bullmq';
import { redisClient } from '@/lib/cache';
import { xpService } from '@/services/gamification/xp-service';
import { logger } from '@/lib/logger';

export class GamificationWorker {
  private static worker: Worker | null = null;

  /**
   * Start the BullMQ worker
   */
  public static async start() {
    if (this.worker) return;

    this.worker = new Worker('gamification', async (job: Job) => {
      try {
        await this.processJob(job);
      } catch (error) {
        logger.error(`Error processing job ${job.id}:`, error);
        throw error; // Let BullMQ handle retries
      }
    }, {
      connection: redisClient as any,
      concurrency: 5,
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed after attempts:`, err);
    });

    logger.info('Gamification Worker started');
  }

  public static async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    logger.info('Gamification Worker stopped');
  }

  private static async processJob(job: Job) {
    // In BullMQ, job.name is usually the 'type' and job.data is the payload
    const { name: type, data: payload, id } = job;

    logger.debug(`Processing job ${id} (Type: ${type})`);

    switch (type) {
      case 'add_xp':
        await xpService.commitXPUpdate(payload.userId, payload.amount, payload.type);
        break;
      
      default:
        logger.warn(`Unknown job type: ${type}`);
    }
  }
}
