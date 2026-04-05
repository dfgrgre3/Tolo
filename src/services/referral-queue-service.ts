import { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { referralQueue } from '@/lib/queue/bullmq';
import { ReferralService } from '@/services/referral-service';

export type ReferralJobPayload = {
  userId: string;
  paymentAmount: number;
  idempotencyKey?: string;
};

export class ReferralQueueService {
  static async enqueue(
    payload: ReferralJobPayload,
    options?: { jobId?: string }
  ) {
    const jobId = options?.jobId ?? payload.idempotencyKey;
    return referralQueue.addJob('PROCESS_REFERRAL_REWARD', payload, jobId);
  }

  static async processJob(job: Job<ReferralJobPayload, any, string>): Promise<void> {
    const { data } = job;
    logger.info(`[ReferralQueue] Processing referral reward for user ${data.userId}`);
    await ReferralService.processReferralReward(data.userId, data.paymentAmount);
  }
}

export default ReferralQueueService;
