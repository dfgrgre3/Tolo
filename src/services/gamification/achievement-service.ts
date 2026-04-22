import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Achievement } from './types';


export class AchievementService {
  private static instance: AchievementService;
  private achievementsMap: Map<string, Achievement> = new Map();

  private constructor() {
    this.initializeAchievements();
  }

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
    { key: 'STUDY_SESSION_COMPLETED', name: 'طالب مجتهد', description: 'أكملت أول جلسة مذاكرة لك', icon: 'ًں“–', xpReward: 100 },
    { key: 'QUIZ_MASTER', name: 'سيد الاختبارات', description: 'حصلت على درجة كاملة في اختبار', icon: 'ًںڈ†', xpReward: 200 },
    { key: 'SEVEN_DAY_STREAK', name: 'الاستمرارية سر النجاح', description: 'حافظت على نشاطك لمدة 7 أيام متتالية', icon: 'ًں”¥', xpReward: 500 }];

    achievements.forEach((a) => this.achievementsMap.set(a.key, a));
  }

  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievementsMap.values());
  }

  public getAchievement(key: string): Achievement | undefined {
    return this.achievementsMap.get(key);
  }

  async unlockAchievement(userId: string, achievementKey: string): Promise<boolean> {
    const achievement = this.achievementsMap.get(achievementKey);
    if (!achievement) return false;

    try {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementKey: {
            userId,
            achievementKey
          }
        }
      });

      if (existing) return false;

      // Use XPService to calculate reward increment
      await prisma.$transaction([
      prisma.userAchievement.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          achievementKey,
          earnedAt: new Date()
        }
      }),
      prisma.userXP.upsert({
        where: { userId },
        update: {
          totalXP: { increment: achievement.xpReward }
        },
        create: {
          userId,
          totalXP: achievement.xpReward
        }
      })]
      );

      return true;
    } catch (error) {
      logger.error(`Error awarding achievement ${achievementKey} to user ${userId}`, error);
      return false;
    }
  }
}

export const achievementService = AchievementService.getInstance();
