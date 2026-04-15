import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { logger } from '../logger';
import { trackQueueLatency } from '@/lib/metrics/prometheus';

const redisUrl = process.env.REDIS_URL;
const isRedisDisabled = process.env.DISABLE_REDIS === 'true';

export const redisConnection = redisUrl && !isRedisDisabled
  ? (() => {
      try {
        const url = new URL(redisUrl);
        return {
          host: url.hostname,
          port: Number(url.port || '6379'),
          username: url.username || undefined,
          password: url.password || undefined,
          db: url.pathname ? Number(url.pathname.replace('/', '') || '0') : 0,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          maxRetriesPerRequest: null,
          connectTimeout: 5000, // 5 second hard timeout for boot survival
          // Skip BullMQ's internal Redis version & eviction policy check.
          // Managed Redis providers (Upstash, Railway, etc.) often report
          // volatile-lru but don't allow CONFIG SET to change it, causing
          // repeated console.warn spam. Configure at the provider level instead.
          skipVersionCheck: true,
        };
      } catch (err) {
        logger.error('[BullMQ] Invalid REDIS_URL, falling back to localhost:', err);
        return { host: 'localhost', port: 6379, maxRetriesPerRequest: null, enableOfflineQueue: false, skipVersionCheck: true };
      }
    })()
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      connectTimeout: isRedisDisabled ? 100 : 5000,
      skipVersionCheck: true,
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
        removeOnComplete: {
          count: 1000, // Keep last 1000 jobs for deduplication
          age: 3600,  // Keep for 1 hour
        },
        removeOnFail: {
          count: 5000,
        },
      },
      ...options,
    });

    this.queue.on('error', (err: any) => {
      const msg = err?.message || err?.code || String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
        // Suppress expected Redis network timeout errors to avoid log spam or unhandled crashes
      } else {
        logger.error(`[BullMQ Queue - ${name}] Error:`, err);
      }
    });

    logger.info(`Queue [${name}] initialized`);
  }

  async addJob(type: string, data: T, options?: { jobId?: string, priority?: number }): Promise<Job<T, any, string>> {
     try {
       const job = await this.queue.add(type as any, data as any, { 
         jobId: options?.jobId,
         priority: options?.priority // Higher number = Lower priority (BullMQ default)
       });
       logger.debug(`Job ${job.id} added to ${this.name} with priority ${options?.priority || 'default'}`);
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
        // Track the latency (time spent in queue)
        if (job.timestamp && job.processedOn) {
          const latency = job.processedOn - job.timestamp;
          trackQueueLatency(this.name, job.name || 'default', latency);
        }
        
        logger.debug(`Processing job ${job.id} on ${this.name}`);
        return this.process(job);
      },
      {
        connection: redisConnection,
        concurrency: options?.concurrency || 20, // Increased default concurrency for 10M-user throughput
        ...options,
      }
    );

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed on ${this.name}:`, err);
    });

    this.worker.on('error', (err: any) => {
      const msg = err?.message || err?.code || String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
        // Suppress expected redis network timeout errors to avoid log spam
      } else {
        logger.error(`[BullMQ Worker - ${this.name}] Error:`, err);
      }
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

// Singleton management for HMR support
const globalForQueues = globalThis as unknown as {
  queues: Record<string, BullQueue>;
};

if (!globalForQueues.queues) {
  globalForQueues.queues = {};
}

function getOrCreateQueue<T>(name: string, options?: any): BullQueue<T> {
  if (process.env.NODE_ENV !== 'production') {
    if (!globalForQueues.queues[name]) {
      globalForQueues.queues[name] = new BullQueue(name, options);
    }
    return globalForQueues.queues[name] as BullQueue<T>;
  }
  return new BullQueue(name, options);
}

export const highPriorityQueue = getOrCreateQueue('high-priority');
export const gamificationQueue = getOrCreateQueue('gamification');
export const notificationQueue = getOrCreateQueue('notifications');
export const analyticsQueue = getOrCreateQueue('analytics');
export const referralQueue = getOrCreateQueue('referrals');
export const bulkSyncQueue = getOrCreateQueue('bulk-sync', {
  defaultJobOptions: { 
    priority: 100, 
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 }
  } 
});

/**
 * Compatibility helper for the old queue system
 */
export const enqueueJob = async (queue: BullQueue, type: string, payload: any, options: { jobId?: string; priority?: number } = {}) => {
  return queue.addJob(type, payload, options);
};
