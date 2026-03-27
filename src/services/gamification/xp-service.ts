import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { UserProgress } from './types';

export class XPService {
  private static instance: XPService;

  private constructor() {}

  public static getInstance(): XPService {
    if (!XPService.instance) {
      XPService.instance = new XPService();
    }
    return XPService.instance;
  }

  async addXP(
    userId: string,
    amount: number,
    type: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season' = 'study'
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const newTotalXP = (user.totalXP || 0) + amount;
      const updates: Prisma.UserUpdateInput = {
        totalXP: newTotalXP,
        level: this.calculateLevel(newTotalXP)
      };

      switch (type) {
        case 'study': updates.studyXP = { increment: amount }; break;
        case 'task': updates.taskXP = { increment: amount }; break;
        case 'exam': updates.examXP = { increment: amount }; break;
        case 'challenge': updates.challengeXP = { increment: amount }; break;
        case 'quest': updates.questXP = { increment: amount }; break;
        case 'season': updates.seasonXP = { increment: amount }; break;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updates
      });

      logger.info(`XP added to user ${userId}: ${amount} (Type: ${type})`);
    } catch (error) {
      logger.error(`Failed to add XP to user ${userId}`, error);
      throw error;
    }
  }

  public calculateLevel(totalXP: number): number {
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  public getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return 100 * (level - 1) * level / 2;
  }

  async calculateStreak(userId: string): Promise<number> {
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 60 // Allow more sessions to calculate days accurately
    });

    if (sessions.length === 0) return 0;

    const dates = new Set(sessions.map((s: any) => new Date(s.startTime).toDateString()));
    let streak = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    if (!dates.has(current.toDateString())) {
      current.setDate(current.getDate() - 1);
    }

    while (dates.has(current.toDateString())) {
      streak++;
      current.setDate(current.getDate() - 1);
    }

    return streak;
  }
}

export const xpService = XPService.getInstance();
