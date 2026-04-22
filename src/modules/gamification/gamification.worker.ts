import { Job } from 'bullmq';
import { BaseWorker } from '@/lib/queue/worker';
import { xpService } from './xp.service';
import { logger } from '@/lib/logger';

export type GamificationJobPayload = {
  userId: string;
  amount?: number;
  type?: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season';
  action?: string;
  data?: any;
};

/**
 * --- GAMIFICATION WORKER ---
 * 
 * Process all asynchronous gamification tasks.
 */
export class GamificationWorker extends BaseWorker<GamificationJobPayload> {
  constructor() {
    super('gamification', {
      concurrency: 10,
    });
  }

  async process(job: Job<GamificationJobPayload, any, string>) {
    const { name, data } = job;

    try {
      switch (name) {
        case 'ADD_XP':
          if (!data.amount || !data.type) throw new Error('Missing data for ADD_XP');
          await xpService.processXPUpdate({
            userId: data.userId,
            amount: data.amount,
            type: data.type
          });
          break;
        
        case 'CHECK_ACHIEVEMENTS':
          logger.info(`[GamificationWorker] Checking achievements for user ${data.userId}`);
          // Achievement service check will be called here
          break;

        case 'PROCESS_ACTION':
          if (!data.action) throw new Error('Missing action for PROCESS_ACTION');
          await xpService.processAction(data.userId, data.action, data.data);
          break;

        default:
          logger.warn(`[GamificationWorker] Unknown job name: ${name}`);
      }
    } catch (error) {
      logger.error(`[GamificationWorker] Error processing job ${job.id}:`, error);
      throw error;
    }
  }
}

// Singleton for the application
export const gamificationWorker = new GamificationWorker();
export default gamificationWorker;
