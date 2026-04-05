import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const queueConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

/**
 * --- QUEUE ARCHITECTURE ---
 * 
 * We use BullMQ (Redis-backed) for high-performance background processing.
 * This prevents blocking API routes for heavy operations like: 
 * - Leaderboard updates
 * - XP calculation
 * - Sending notifications
 * - Analytics processing
 */

const defaultQueueOptions: QueueOptions = {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// --- Queue Instances ---
export const gamificationQueue = new Queue('gamification', defaultQueueOptions);
export const notificationQueue = new Queue('notifications', defaultQueueOptions);
export const analyticsQueue = new Queue('analytics', defaultQueueOptions);
export const systemEventsQueue = new Queue('system-events', defaultQueueOptions);

// --- Queue Utility Helper ---
/**
 * Generic job enqueuer with logging
 */
export const enqueueJob = async (queue: Queue, name: string, payload: any, options = {}) => {
  try {
    const job = await queue.add(name, {
        ...payload,
        timestamp: Date.now(),
    }, options);
    
    logger.info(`Job ${job.id} enqueued successfully in ${queue.name}:${name}`);
    return job;
  } catch (error) {
    logger.error(`Failed to enqueue job in ${queue.name}:`, error);
    throw error;
  }
};

/**
 * Monitor queue health and connectivity
 */
const setupQueueMonitor = (queue: Queue) => {
  queue.on('error', (err) => {
    logger.error(`BullMQ [${queue.name}] Critical Error:`, err);
  });
};

[gamificationQueue, notificationQueue, analyticsQueue, systemEventsQueue].forEach(setupQueueMonitor);

export default {
  gamification: gamificationQueue,
  notifications: notificationQueue,
  analytics: analyticsQueue,
  events: systemEventsQueue,
  enqueue: enqueueJob,
};
