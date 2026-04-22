import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export class StatsRepository {
  /**
   * Atomic update of UserStats to avoid race conditions and hot-row contention.
   */
  async incrementUserXP(userId: string, amount: number, xpField: string) {
    try {
      return await prisma.userXP.upsert({
        where: { userId },
        create: {
          userId,
          totalXP: amount,
          [xpField]: amount,
          level: 1,
        },
        update: {
          totalXP: { increment: amount },
          [xpField]: { increment: amount },
          updatedAt: new Date(),
        },
        select: {
          totalXP: true,
          level: true,
        }
      });
    } catch (error) {
      logger.error(`DB Error in StatsRepository for user ${userId}:`, error);
      throw error;
    }
  }

  async updateUserLevel(userId: string, newLevel: number) {
    return await prisma.userXP.update({
      where: { userId },
      data: { level: newLevel },
    });
  }

  async getStats(userId: string) {
    return await prisma.userXP.findUnique({
      where: { userId },
    });
  }
}

export const statsRepository = new StatsRepository();
