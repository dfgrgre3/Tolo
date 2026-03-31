import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { redisClient } from '../cache';
import { logger } from '../logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

/**
 * Enhanced BullMQ wrapper for the modular monolith
 */
export class BullQueue<T = any> {
  private queue: Queue<T>;
  private name: string;

  constructor(name: string, options?: Partial<QueueOptions>) {
    this.name = name;
    this.queue = new Queue(name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      ...options,
    });

    logger.info(`Queue [${name}] initialized`);
  }

  async addJob(type: string, data: T, jobId?: string): Promise<Job<T, any, string>> {
    try {
      const job = await this.queue.add(type as any, data as any, { jobId });
      logger.debug(`Job ${job.id} added to ${this.name}`);
      return job as any;
    } catch (error) {
      logger.error(`Failed to add job to ${this.name}:`, error);
      throw error;
    }
  }

  getInternalQueue() {
    return this.queue;
  }
}

/**
 * Base Worker class for modular services
 */
export abstract class BaseWorker<T = any> {
  protected worker: Worker<T>;
  protected name: string;

  constructor(name: string, options?: Partial<WorkerOptions>) {
    this.name = name;
    this.worker = new Worker(
      name,
      async (job: Job<T, any, string>) => {
        logger.debug(`Processing job ${job.id} on ${this.name}`);
        return this.process(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
        ...options,
      }
    );

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed on ${this.name}:`, err);
    });

    this.worker.on('completed', (job) => {
      logger.debug(`Job ${job.id} completed on ${this.name}`);
    });

    logger.info(`Worker [${this.name}] initialized`);
  }

  abstract process(job: Job<T, any, string>): Promise<void>;

  async stop() {
    await this.worker.close();
  }
}

// Singleton instances for common queues
export const gamificationQueue = new BullQueue('gamification');
export const notificationQueue = new BullQueue('notifications');
export const analyticsQueue = new BullQueue('analytics');
