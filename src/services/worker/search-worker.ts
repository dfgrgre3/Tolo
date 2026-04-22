import { Worker, Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { redisConnection } from '@/lib/queue/bullmq';
import { searchService } from '@/services/search-service';
import { prisma } from '@/lib/db';

/**
 * SearchWorker - Background worker to sync data from DB to Elasticsearch.
 * This ensures that indexing doesn't slow down API write operations.
 */
export const searchWorker = new Worker(
  'search-sync',
  async (job: Job) => {
    const { type, id, action } = job.data;
    
    logger.info(`[SearchWorker] Processing ${action} for ${type}:${id}`);

    try {
      if (action === 'delete') {
        // Handle deletion if searchService supported it (placeholder)
        // await searchService.delete(type, id);
        return;
      }

      if (type === 'book') {
        const book = await prisma.book.findUnique({ where: { id } });
        if (book) await searchService.indexBook(book);
      } else if (type === 'course') {
        const subject = await prisma.subject.findUnique({
          where: { id },
          include: { 
            teachers: true
          }
        });
        if (subject) await searchService.indexCourse(subject as any);
      }
    } catch (error) {
      logger.error(`[SearchWorker] Job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 indexing jobs at a time
  }
);

searchWorker.on('completed', (job) => {
  logger.info(`[SearchWorker] Job ${job.id} completed`);
});

searchWorker.on('failed', (job, err) => {
  logger.error(`[SearchWorker] Job ${job?.id} failed with ${err.message}`);
});
