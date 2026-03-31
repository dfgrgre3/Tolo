import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ProgressUpdateData {
  userId: string;
  subTopicId: string;
  completed: boolean;
}

/**
 * --- PROGRESS REPOSITORY ---
 * 
 * Handles all database operations for lesson (topic) progress.
 */
export class ProgressRepository {
  /**
   * Atomic update or creation of topic progress.
   */
  async upsertProgress(data: ProgressUpdateData) {
    const { userId, subTopicId, completed } = data;
    
    try {
      return await prisma.topicProgress.upsert({
        where: {
          userId_subTopicId: {
            userId,
            subTopicId
          }
        },
        update: {
          completed,
          completedAt: completed ? new Date() : null,
          updatedAt: new Date()
        },
        create: {
          userId,
          subTopicId,
          completed,
          completedAt: completed ? new Date() : null
        }
      });
    } catch (error) {
      logger.error(`[ProgressRepository] Failed to upsert progress for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Read-only lookup for a user's progress on a specific topic.
   */
  async getProgress(userId: string, subTopicId: string) {
    return await prisma.topicProgress.findUnique({
      where: {
        userId_subTopicId: {
          userId,
          subTopicId
        }
      }
    });
  }

  /**
   * Bulk summary for a given user.
   */
  async getUserProgressSummary(userId: string) {
      return await prisma.topicProgress.findMany({
          where: { userId }
      });
  }
}

export const progressRepository = new ProgressRepository();
export default progressRepository;
