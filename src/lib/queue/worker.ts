import { Worker, Job, WorkerOptions } from 'bullmq';
import { redisConnection } from './bullmq';
import { logger } from '../logger';

/**
 * --- MODULAR MONOLITH WORKER BASE ---
 * 
 * This class provides a standard way to implement BullMQ workers in Next.js.
 * Features: 
 * - Standard Error Handling
 * - Ready for cluster scaling
 * - Logging & Monitoring
 */
export abstract class BaseWorker<T = any> {
    protected worker: Worker<T>;
    protected name: string;

    constructor(name: string, options: Partial<WorkerOptions> = {}) {
        this.name = name;
        this.worker = new Worker(
            name,
            async (job: Job<T, any, string>) => {
                try {
                    logger.debug(`[Worker:${name}] Processing job ${job.id}`);
                    const result = await this.process(job);
                    return result;
                } catch (error) {
                    logger.error(`[Worker:${name}] Critical failure on job ${job.id}:`, error);
                    throw error; // Re-throw to allow BullMQ to handle retries
                }
            },
            {
                connection: redisConnection,
                concurrency: 5,
                ...options,
            }
        );

        this.setupEvents();
        logger.info(`[Worker:${name}] Initialized and listening for jobs.`);
    }

    private setupEvents() {
        this.worker.on('completed', (job) => {
            logger.debug(`[Worker:${this.name}] Job ${job.id} completed successfully.`);
        });

        this.worker.on('failed', (job, err) => {
            logger.error(`[Worker:${this.name}] Job ${job?.id} failed with error:`, err);
        });

        this.worker.on('error', (err) => {
            logger.error(`[Worker:${this.name}] Critical Redis connection error:`, err);
        });
    }

    /**
     * The actual job processing logic. Implement in subclasses.
     */
    abstract process(job: Job<T, any, string>): Promise<any>;

    public async close() {
        await this.worker.close();
    }
}
