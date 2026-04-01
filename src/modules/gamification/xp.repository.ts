import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface XPUpdateData {
  userId: string;
  amount: number;
  type: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season';
}

/**
 * --- GAMIFICATION REPOSITORY ---
 * 
 * Handles all database interactions for XP and User Stats.
 * Goal: Minimize row contention on the primary User table by using a split UserXP table.
 */
export class XPRepository {
  /**
   * Atomic update of XP stats using upsert.
   * This avoids race conditions and ensures the row exists.
   */
  async updateStats(data: XPUpdateData, tx: any = prisma) {
    const { userId, amount, type } = data;
    
    // Map the internal type to the correct Prisma field
    const fieldMap: Record<string, string> = {
      study: 'studyXP',
      task: 'taskXP',
      exam: 'examXP',
      challenge: 'challengeXP',
      quest: 'questXP',
      season: 'seasonXP'
    };
    
    const specificField = fieldMap[type] || 'studyXP';

    try {
      return await tx.userXP.upsert({
        where: { userId },
        create: {
          userId,
          totalXP: amount,
          level: 1, // Service will handle level calculation
          [specificField as any]: amount,
        },
        update: {
          totalXP: { increment: amount },
          [specificField as any]: { increment: amount },
          updatedAt: new Date()
        },
        select: {
          totalXP: true,
          level: true
        }
      });
    } catch (error) {
      logger.error(`[XPRepository] Critical DB Error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Updates only the level field in the split table.
   */
  async updateLevel(userId: string, newLevel: number, tx: any = prisma) {
    try {
      return await tx.userXP.update({
        where: { userId },
        data: { level: newLevel },
        select: { level: true }
      });
    } catch (error) {
      logger.error(`[XPRepository] Failed to update level for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Fetches full XP snapshot for a user.
   */
  async getUserXP(userId: string) {
    return await prisma.userXP.findUnique({
      where: { userId },
    });
  }

  /**
   * Fetches the user activity (streaks, study time, etc.)
   */
  async getUserActivity(userId: string) {
    return await prisma.userActivity.findUnique({
      where: { userId },
    });
  }
}

export const xpRepository = new XPRepository();
export default xpRepository;
