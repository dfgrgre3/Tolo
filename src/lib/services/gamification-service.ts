import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category?: string;
  difficulty?: string;
}

export interface UserProgress {
  userId: string;
  totalXP: number;
  level: number;
  nextLevelXP?: number;
  progressToNextLevel?: number;
  achievements: string[];
  currentStreak: number;
  longestStreak: number;
  // Multi-layer XP
  studyXP?: number;
  taskXP?: number;
  examXP?: number;
  challengeXP?: number;
  questXP?: number;
  seasonXP?: number;
  // Stats
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  customGoals: any[];
}

export interface Season {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rewards?: any;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'study' | 'tasks' | 'exams' | 'streak' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  requirements: Record<string, any>;
  startDate: Date;
  endDate: Date;
  subjectId?: string;
  levelRange?: [number, number];
}

export interface QuestChain {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  totalQuests: number;
  quests: Quest[];
}

export interface Quest {
  id: string;
  chainId: string;
  title: string;
  description: string;
  order: number;
  xpReward: number;
  requirements: Record<string, any>;
  prerequisites?: string[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  rank: number;
  avatar?: string;
  // Optional advanced scores
  studyXP?: number;
  taskXP?: number;
  examXP?: number;
  challengeXP?: number;
  questXP?: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'virtual' | 'nft' | 'badge' | 'title';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl?: string;
  metadata?: any;
}

export interface CustomGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  xpReward: number;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
}

// ==================== SERVICE ====================

export class GamificationService {
  private static instance: GamificationService;
  private achievementsMap: Map<string, Achievement> = new Map();

  private constructor() {
    this.initializeAchievements();
  }

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      { key: 'STUDY_SESSION_COMPLETED', name: 'طالب مجتهد', description: 'أكملت أول جلسة مذاكرة لك', icon: '📖', xpReward: 100 },

      { key: 'QUIZ_MASTER', name: 'سيد الاختبارات', description: 'حصلت على درجة كاملة في اختبار', icon: '🏆', xpReward: 200 },
      { key: 'SEVEN_DAY_STREAK', name: 'الاستمرارية سر النجاح', description: 'حافظت على نشاطك لمدة 7 أيام متتالية', icon: '🔥', xpReward: 500 },
    ];

    achievements.forEach(a => this.achievementsMap.set(a.key, a));
  }

  // ===== Progress & XP =====

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

      // Update specific layer XP
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

  async getUserProgress(userId: string): Promise<UserProgress> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        customGoals: true
      }
    });

    if (!user) throw new Error('User not found');

    const totalXP = user.totalXP || 0;
    const level = this.calculateLevel(totalXP);
    const xpForCurrentLevel = this.getXPForLevel(level);
    const xpForNextLevel = this.getXPForLevel(level + 1);

    return {
      userId,
      totalXP,
      level,
      nextLevelXP: xpForNextLevel,
      progressToNextLevel: ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100,
      achievements: user.achievements.map((a: any) => a.achievementKey),
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      studyXP: user.studyXP || 0,
      taskXP: user.taskXP || 0,
      examXP: user.examXP || 0,
      challengeXP: user.challengeXP || 0,
      questXP: user.questXP || 0,
      seasonXP: user.seasonXP || 0,
      totalStudyTime: user.totalStudyTime || 0,
      tasksCompleted: user.tasksCompleted || 0,
      examsPassed: user.examsPassed || 0,
      customGoals: user.customGoals || []
    };
  }

  async updateUserProgress(userId: string, action: string, data: any): Promise<UserProgress> {
    logger.info(`Updating progress for user ${userId} based on action ${action}`);

    // Add XP based on action
    switch (action) {
      case 'exam_completed':
        const score = data?.score || 0;
        let xp = 100; // Base XP for completing an exam
        if (score >= 90) xp += 100;
        else if (score >= 75) xp += 50;

        await this.addXP(userId, xp, 'exam');

        // Potential achievement check
        if (score === 100) {
          await this.unlockAchievement(userId, 'QUIZ_MASTER');
        }
        break;

      case 'study_session_completed':
        const duration = data?.duration || 0;
        const studyXP = Math.floor(duration / 10); // 1 XP per minute
        await this.addXP(userId, studyXP, 'study');
        await this.unlockAchievement(userId, 'STUDY_SESSION_COMPLETED');
        break;

      case 'task_completed':
        await this.addXP(userId, 20, 'task');
        break;
    }

    return this.getUserProgress(userId);
  }

  // ===== Achievements =====

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

      await prisma.$transaction([
        prisma.userAchievement.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            achievementKey,
            earnedAt: new Date()
          }
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            totalXP: { increment: achievement.xpReward }
          }
        })
      ]);

      return true;
    } catch (error) {
      logger.error(`Error awarding achievement ${achievementKey} to user ${userId}`, error);
      return false;
    }
  }

  // Backward compatibility alias
  async awardAchievement(userId: string, achievementKey: string): Promise<boolean> {
    return this.unlockAchievement(userId, achievementKey);
  }

  // ===== Seasons =====

  async getActiveSeason(): Promise<Season | null> {
    const season = await prisma.season.findFirst({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    return season ? {
      id: season.id,
      name: season.name,
      description: season.description || undefined,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      rewards: season.rewards
    } : null;
  }

  // ===== Challenges =====

  async getActiveChallenges(type?: 'daily' | 'weekly' | 'monthly'): Promise<Challenge[]> {
    const now = new Date();
    const where: Prisma.ChallengeWhereInput = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    };

    if (type) where.type = type;

    const challenges = await prisma.challenge.findMany({ where, orderBy: { startDate: 'desc' } });

    return challenges.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      type: c.type as any,
      category: c.category as any,
      difficulty: (c.difficulty as any) || 'medium',
      xpReward: c.xpReward,
      requirements: (c.requirements as any) || {},
      startDate: c.startDate,
      endDate: c.endDate,
      subjectId: c.subjectId || undefined,
      levelRange: c.levelRange as any
    }));
  }

  // ===== Quests =====

  async getActiveQuestChains(): Promise<QuestChain[]> {
    const chains = await prisma.questChain.findMany({
      where: { isActive: true },
      include: {
        quests: { orderBy: { order: 'asc' } }
      }
    });

    return chains.map((chain: any) => ({
      id: chain.id,
      title: chain.title,
      description: chain.description || '',
      category: chain.category || '',
      difficulty: chain.difficulty || '',
      totalQuests: chain.quests.length,
      quests: chain.quests.map((q: any) => ({
        id: q.id,
        chainId: q.chainId,
        title: q.title,
        description: q.description || '',
        order: q.order,
        xpReward: q.xpReward,
        requirements: (q.requirements as any) || {},
        prerequisites: (q.prerequisites as any) || undefined
      }))
    }));
  }

  // ===== Leaderboards =====

  async getLeaderboard(
    type: 'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' = 'global',
    limit: number = 50,
    options: { subjectId?: string; seasonId?: string; period?: string } = {}
  ): Promise<LeaderboardEntry[]> {
    if (type === 'global') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalXP: true,
          level: true,
          avatar: true
        },
        orderBy: { totalXP: 'desc' },
        take: limit
      });

      return users.map((u: any, i: number) => ({
        userId: u.id,
        username: u.username || 'طالب مجهول',
        totalXP: u.totalXP || 0,
        level: u.level || 1,
        rank: i + 1,
        avatar: u.avatar || undefined
      }));
    }

    // Advanced leaderboards from dedicated table
    const where: Prisma.LeaderboardEntryWhereInput = { type: type as any };
    if (options.subjectId) where.subjectId = options.subjectId;
    if (options.seasonId) where.seasonId = options.seasonId;
    if (options.period) where.period = options.period;

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      include: { user: { select: { username: true, avatar: true } } },
      orderBy: { totalXP: 'desc' },
      take: limit
    });

    return entries.map((e: any, i: number) => ({
      userId: e.userId,
      username: e.user?.username || 'طالب مجهول',
      totalXP: e.totalXP,
      level: e.level,
      rank: i + 1,
      avatar: e.user?.avatar || undefined,
      studyXP: e.studyXP,
      taskXP: e.taskXP,
      examXP: e.examXP,
      challengeXP: e.challengeXP,
      questXP: e.questXP,
    }));
  }

  // ===== Helpers =====

  public calculateLevel(totalXP: number): number {
    // Level calculation: each level requires 100 XP more than the previous
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  private getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return 100 * (level - 1) * level / 2;
  }

  async calculateStreak(userId: string): Promise<number> {
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 30
    });

    if (sessions.length === 0) return 0;

    const dates = new Set(sessions.map((s: any) => new Date(s.startTime).toDateString()));
    let streak = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    // If no session today, check if there was one yesterday to keep streak alive
    if (!dates.has(current.toDateString())) {
      current.setDate(current.getDate() - 1);
    }

    while (dates.has(current.toDateString())) {
      streak++;
      current.setDate(current.getDate() - 1);
    }

    return streak;
  }

  // ===== Goals =====
  async createCustomGoal(userId: string, data: Partial<CustomGoal>): Promise<CustomGoal> {
    try {
      const result = await prisma.customGoal.create({
        data: {
          userId,
          title: data.title || 'Untitled Goal',
          description: data.description,
          targetValue: data.targetValue || 0,
          currentValue: data.currentValue || 0,
          unit: data.unit || 'unit',
          category: data.category || 'custom',
          xpReward: data.xpReward || 10,
          isCompleted: false,
        }
      });
      return result as unknown as CustomGoal;
    } catch (error) {
      logger.error('Failed to create custom goal', error);
      throw error;
    }
  }

  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    try {
      const goal = await prisma.customGoal.findUnique({ where: { id: goalId } });
      if (!goal) throw new Error('Goal not found');

      const isCompleted = currentValue >= goal.targetValue;
      const completedAt = isCompleted && !goal.isCompleted ? new Date() : goal.completedAt;

      const updatedGoal = await prisma.customGoal.update({
        where: { id: goalId },
        data: {
          currentValue,
          isCompleted,
          completedAt
        }
      });

      // If goal was just completed, award XP
      if (isCompleted && !goal.isCompleted) {
        await this.addXP(goal.userId, (updatedGoal as unknown as CustomGoal).xpReward, 'task');
      }

      return updatedGoal as unknown as CustomGoal;
    } catch (error) {
      logger.error('Failed to update custom goal', error);
      throw error;
    }
  }

  async deleteCustomGoal(goalId: string): Promise<boolean> {
    try {
      await prisma.customGoal.delete({ where: { id: goalId } });
      return true;
    } catch (error) {
      logger.error('Failed to delete custom goal', error);
      return false;
    }
  }
}

export const gamificationService = GamificationService.getInstance();
export default gamificationService;
