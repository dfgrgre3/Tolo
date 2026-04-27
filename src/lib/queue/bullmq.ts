import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../logger';
import Redis from 'ioredis';

// Dedicated Redis connection for BullMQ as per documentation requirements
// BullMQ requires maxRetriesPerRequest to be null
const queueConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

/**
 * Ensures Redis is configured with 'noeviction' policy.
 * BullMQ requires this to prevent data loss when Redis is under memory pressure.
 */
async function ensureCorrectEvictionPolicy() {
    try {
        const result = await queueConnection.config('GET', 'maxmemory-policy');
        // ioredis returns config as [name, value]
        const policy = Array.isArray(result) ? result[1] : null;
        
        if (policy && policy !== 'noeviction') {
            logger.warn(`[BullMQ] Redis eviction policy is '${policy}'. Attempting to set to 'noeviction'...`);
            await queueConnection.config('SET', 'maxmemory-policy', 'noeviction');
            logger.info('[BullMQ] Redis eviction policy successfully set to \'noeviction\'');
        } else if (!policy) {
            logger.debug('[BullMQ] Could not determine Redis eviction policy via CONFIG GET');
        }
    } catch (error) {
        // Many managed Redis services (like Redis Labs free tier) disable CONFIG commands
        logger.debug('[BullMQ] Could not automatically configure Redis eviction policy:', error instanceof Error ? error.message : String(error));
        logger.warn(
            '[BullMQ] IMPORTANT: Ensure your Redis maxmemory-policy is set to \'noeviction\' ' +
            'to prevent job loss under memory pressure.'
        );
    }
}

// Run check on startup
ensureCorrectEvictionPolicy();

function getQueueConnection() {
    return queueConnection;
}

// Base Worker class that other workers can extend
export abstract class BaseWorker<T = any> {
    private worker: Worker;
    private queue: Queue;

    constructor(
        queueName: string,
        options?: {
            concurrency?: number;
        }
    ) {
        const connection = getQueueConnection();

        this.queue = new Queue(queueName, {
            connection,
        });

        this.worker = new Worker(
            queueName,
            async (job: Job<T>) => {
                try {
                    await this.process(job);
                } catch (error) {
                    logger.error(`[${queueName}Worker] Error processing job ${job.id}:`, error);
                    throw error;
                }
            },
            {
                connection,
                concurrency: options?.concurrency || 10,
            }
        );

        this.worker.on('completed', (job) => {
            logger.debug(`[${queueName}Worker] Job ${job.id} completed`);
        });

        this.worker.on('failed', (job, err) => {
            logger.error(`[${queueName}Worker] Job ${job?.id} failed:`, err);
        });

        logger.info(`[${queueName}Worker] Worker initialized`);
    }

    abstract process(job: Job<T, any, string>): Promise<void>;

    getQueue(): Queue {
        return this.queue;
    }

    async close(): Promise<void> {
        await this.worker.close();
        await this.queue.close();
    }
}

// Queue wrapper class
class AppQueue {
    private queue: Queue;

    constructor(name: string) {
        const connection = getQueueConnection();
        this.queue = new Queue(name, {
            connection,
        });
    }

    async addJob(name: string, data: any, options?: any) {
        return await this.queue.add(name, data, options);
    }

    getInternalQueue(): Queue {
        return this.queue;
    }

    async close() {
        return await this.queue.close();
    }
}

// Create queue instances
export const gamificationQueue = new AppQueue('gamification');
export const notificationQueue = new AppQueue('notifications');
export const analyticsQueue = new AppQueue('analytics');
export const referralQueue = new AppQueue('referral');

// Helper function to enqueue jobs
export async function enqueueJob(queueName: string, jobName: string, data: any, options?: any) {
    const queueMap: Record<string, AppQueue> = {
        gamification: gamificationQueue,
        notification: notificationQueue,
        analytics: analyticsQueue,
        referral: referralQueue,
    };

    const queue = queueMap[queueName];
    if (!queue) {
        throw new Error(`Unknown queue: ${queueName}`);
    }

    return await queue.addJob(jobName, data, options);
}