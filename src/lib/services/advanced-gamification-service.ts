import { prisma } from '../db';
import { Prisma } from '@prisma/client';

// Extended interfaces for advanced gamification
export interface AdvancedUserProgress {
  userId: string;
  totalXP: number;
  level: number;
  // Multi-layer XP
  studyXP: number;
  taskXP: number;
  examXP: number;
  challengeXP: number;
  questXP: number;
  seasonXP: number;
  // Stats
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  achievements: string[];
  customGoals: unknown[];
}

export interface Season {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rewards?: unknown;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'study' | 'tasks' | 'exams' | 'streak' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  requirements: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  subject?: string;
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
  requirements: Record<string, unknown>;
  prerequisites?: string[];
}

export interface AdvancedLeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  studyXP: number;
  taskXP: number;
  examXP: number;
  challengeXP: number;
  questXP: number;
  seasonXP: number;
  level: number;
  rank: number;
  avatar?: string;
  subjectId?: string;
  subject?: any;
  levelRange?: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'virtual' | 'nft' | 'badge' | 'title';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl?: string;
  metadata?: unknown;
}

export class AdvancedGamificationService {
  private static instance: AdvancedGamificationService;

  static getInstance(): AdvancedGamificationService {
    if (!AdvancedGamificationService.instance) {
      AdvancedGamificationService.instance = new AdvancedGamificationService();
    }
    return AdvancedGamificationService.instance;
  }

  // ===== Multi-layer Points System =====
  async addXP(userId: string, xpType: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season', amount: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const newTotalXP = (user.totalXP || 0) + amount;
    const updates: Prisma.UserUpdateInput = {
      totalXP: newTotalXP,
    };

    switch (xpType) {
      case 'study':
        updates.studyXP = (user.studyXP || 0) + amount;
        break;
      case 'task':
        updates.taskXP = (user.taskXP || 0) + amount;
        break;
      case 'exam':
        updates.examXP = (user.examXP || 0) + amount;
        break;
      case 'challenge':
        updates.challengeXP = (user.challengeXP || 0) + amount;
        break;
      case 'quest':
        updates.questXP = (user.questXP || 0) + amount;
        break;
      case 'season':
        updates.seasonXP = (user.seasonXP || 0) + amount;
        break;
    }

    updates.level = this.calculateLevel(newTotalXP);

    await prisma.user.update({
      where: { id: userId },
      data: updates
    });
  }

  async getUserProgress(userId: string): Promise<AdvancedUserProgress> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        customGoals: true
      }
    });

    if (!user) throw new Error('User not found');

    return {
      userId,
      totalXP: user.totalXP || 0,
      level: this.calculateLevel(user.totalXP || 0),
      studyXP: user.studyXP || 0,
      taskXP: user.taskXP || 0,
      examXP: user.examXP || 0,
      challengeXP: user.challengeXP || 0,
      questXP: user.questXP || 0,
      seasonXP: user.seasonXP || 0,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalStudyTime: user.totalStudyTime || 0,
      tasksCompleted: user.tasksCompleted || 0,
      examsPassed: user.examsPassed || 0,
      achievements: user.achievements.map((a: { achievementKey: string }) => a.achievementKey),
      customGoals: user.customGoals.map((g: { id: string; userId: string; title: string; description: string | null; targetValue: number; currentValue: number; category: string | null; unit?: string | null; isCompleted?: boolean; createdAt?: Date; completedAt?: Date | null }) => ({
        id: g.id,
        userId: g.userId,
        title: g.title,
        description: g.description || '',
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        unit: g.unit || undefined,
        category: g.category || '',
        isCompleted: g.isCompleted || false,
        createdAt: g.createdAt || new Date(),
        completedAt: g.completedAt || undefined
      }))
    };
  }

  // ===== Seasons System =====
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
      rewards: season.rewards as unknown
    } : null;
  }

  async joinSeason(userId: string, seasonId: string): Promise<void> {
    const existing = await prisma.seasonParticipation.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId
        }
      }
    });

    if (existing) return; // Already joined

    await prisma.seasonParticipation.create({
      data: {
        userId,
        seasonId,
        seasonXP: 0
      }
    });
  }

  async updateSeasonXP(userId: string, seasonId: string, xp: number): Promise<void> {
    await prisma.seasonParticipation.update({
      where: {
        userId_seasonId: {
          userId,
          seasonId
        }
      },
      data: {
        seasonXP: { increment: xp }
      }
    });

    // Also update user's seasonXP
    await this.addXP(userId, 'season', xp);
  }

  async getSeasonLeaderboard(seasonId: string, limit: number = 50): Promise<AdvancedLeaderboardEntry[]> {
    const participations = await prisma.seasonParticipation.findMany({
      where: { seasonId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true
          }
        }
      },
      orderBy: { seasonXP: 'desc' },
      take: limit
    });

    return participations.map((p: { userId: string; seasonXP?: number | null; user: { username: string | null; level?: number | null; avatar?: string | null } }, index: number) => ({
      userId: p.userId,
      username: p.user.username || 'مستخدم مجهول',
      totalXP: 0,
      studyXP: 0,
      taskXP: 0,
      examXP: 0,
      challengeXP: 0,
      questXP: 0,
      seasonXP: p.seasonXP || 0,
      level: p.user.level || 1,
      rank: index + 1,
      avatar: p.user.avatar || undefined
    }));
  }

  // ===== Challenges System =====
  async getActiveChallenges(userId?: string, type?: 'daily' | 'weekly' | 'monthly'): Promise<Challenge[]> {
    const now = new Date();
    const where: Prisma.ChallengeWhereInput = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    };

    if (type) {
      where.type = type;
    }

    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { startDate: 'desc' }
    });

    return challenges.map((c: { id: string; title: string; description: string | null; type: string; category: string | null; startDate: Date; endDate: Date; xpReward: number; requirements: unknown; difficulty?: string | null; subject?: string | null; levelRange?: unknown }) => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      type: c.type as Challenge['type'],
      category: c.category as Challenge['category'],
      difficulty: (c.difficulty as Challenge['difficulty']) || undefined,
      xpReward: c.xpReward,
      requirements: c.requirements as Record<string, unknown>,
      startDate: c.startDate,
      endDate: c.endDate,
      subjectId: c.subjectId || undefined,
      levelRange: c.levelRange as [number, number] | undefined
    }));
  }

  async updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<void> {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error('Challenge not found');

    const completion = await prisma.challengeCompletion.upsert({
      where: {
        userId_challengeId: {
          userId,
          challengeId
        }
      },
      create: {
        userId,
        challengeId,
        progress,
        isCompleted: progress >= 100
      },
      update: {
        progress,
        isCompleted: progress >= 100,
        completedAt: progress >= 100 ? new Date() : undefined
      }
    });

    // Award XP if completed
    if (completion.isCompleted && progress >= 100) {
      await this.addXP(userId, 'challenge', challenge.xpReward);
    }
  }

  async getUserChallenges(userId: string): Promise<Array<Challenge & { progress: number; isCompleted: boolean }>> {
    const challenges = await this.getActiveChallenges();
    const completions = await prisma.challengeCompletion.findMany({
      where: {
        userId,
        challengeId: { in: challenges.map(c => c.id) }
      }
    });

    const completionMap = new Map(completions.map((c: { challengeId: string; progress?: number; isCompleted?: boolean }) => [c.challengeId, c]));

    return challenges.map((challenge) => {
      const completion = completionMap.get(challenge.id);
      return {
        ...challenge,
        progress: (completion as { progress?: number } | undefined)?.progress || 0,
        isCompleted: (completion as { isCompleted?: boolean } | undefined)?.isCompleted || false
      } as Challenge & { progress: number; isCompleted: boolean };
    });
  }

  // ===== Quest System =====
  async getActiveQuestChains(userId?: string): Promise<QuestChain[]> {
    const chains = await prisma.questChain.findMany({
      where: { isActive: true },
      include: {
        quests: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return chains.map((chain: { id: string; title: string; description: string | null; category: string | null; difficulty: string | null; quests: Array<{ id: string; chainId: string; title: string; description: string | null; order: number }> }) => ({
      id: chain.id,
      title: chain.title,
      description: chain.description || '',
      category: chain.category || '',
      difficulty: chain.difficulty || '',
      totalQuests: chain.quests.length,
      quests: chain.quests.map((q: { id: string; chainId: string; title: string; description: string | null; order: number; xpReward?: number; requirements?: unknown; prerequisites?: string[] | null }) => ({
        id: q.id,
        chainId: q.chainId,
        title: q.title,
        description: q.description || '',
        order: q.order,
        xpReward: q.xpReward || 0,
        requirements: (q.requirements as Record<string, any>) || {},
        prerequisites: (q.prerequisites as unknown as string[]) || undefined
      }))
    }));
  }

  async getQuestProgress(userId: string, chainId: string): Promise<Array<Quest & { progress: number; isCompleted: boolean }>> {
    const chain = await prisma.questChain.findUnique({
      where: { id: chainId },
      include: {
        quests: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!chain) throw new Error('Quest chain not found');

    const progresses = await prisma.questProgress.findMany({
      where: {
        userId,
        chainId
      }
    });

    const progressMap = new Map(progresses.map((p: { questId: string; progress?: number; isCompleted?: boolean }) => [p.questId, p]));

    return chain.quests.map((quest) => {
      const progress = progressMap.get(quest.id);
      return {
        id: quest.id,
        chainId: quest.chainId,
        title: quest.title,
        description: quest.description || '',
        order: quest.order,
        xpReward: quest.xpReward,
        requirements: (quest.requirements as unknown) as Record<string, unknown>,
        prerequisites: (quest.prerequisites as unknown as string[]) || undefined,
        progress: (progress as { progress?: number } | undefined)?.progress || 0,
        isCompleted: (progress as { isCompleted?: boolean } | undefined)?.isCompleted || false
      };
    });
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<void> {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: { chain: true }
    });

    if (!quest) throw new Error('Quest not found');

    // Check prerequisites
    const prerequisites = quest.prerequisites as unknown as string[];
    if (prerequisites && Array.isArray(prerequisites) && prerequisites.length > 0) {
      const prerequisiteQuests = await prisma.questProgress.findMany({
        where: {
          userId,
          questId: { in: prerequisites },
          isCompleted: true
        }
      });

      if (prerequisiteQuests.length < prerequisites.length) {
        throw new Error('Prerequisites not met');
      }
    }

    const questProgress = await prisma.questProgress.upsert({
      where: {
        userId_questId: {
          userId,
          questId
        }
      },
      create: {
        userId,
        questId,
        chainId: quest.chainId,
        progress,
        isCompleted: progress >= 100
      },
      update: {
        progress,
        isCompleted: progress >= 100,
        completedAt: progress >= 100 ? new Date() : undefined
      }
    });

    // Award XP if completed
    if (questProgress.isCompleted && progress >= 100) {
      await this.addXP(userId, 'quest', quest.xpReward);
    }
  }

  // ===== Advanced Leaderboards =====
  async getLeaderboard(
    type: 'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' | 'level',
    options: {
      period?: string;
      subject?: string;
      levelRange?: string;
      seasonId?: string;
      limit?: number;
    } = {}
  ): Promise<AdvancedLeaderboardEntry[]> {
    const { period, subject, levelRange, seasonId, limit = 50 } = options;

    // For advanced leaderboards, use LeaderboardEntry table
    if (type !== 'global') {
      const where: Prisma.LeaderboardEntryWhereInput = { type };
      if (period) where.period = period;
      if (subject) where.subjectId = subject;
      if (levelRange) where.levelRange = levelRange;
      if (seasonId) where.seasonId = seasonId;

      const entries = await prisma.leaderboardEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              level: true
            }
          },
          subject: true
        },
        orderBy: { totalXP: 'desc' },
        take: limit
      });

      return (entries as any[]).map((entry, index: number) => {
        const levelRange = entry.levelRange;
        const levelRangeStr = Array.isArray(levelRange)
          ? `${levelRange[0]}-${levelRange[1]}`
          : (typeof levelRange === 'string' ? levelRange : undefined);

        return {
          userId: entry.userId,
          username: entry.user?.username || 'مستخدم مجهول',
          totalXP: entry.totalXP,
          studyXP: entry.studyXP,
          taskXP: entry.taskXP,
          examXP: entry.examXP,
          challengeXP: entry.challengeXP,
          questXP: entry.questXP || 0,
          seasonXP: entry.seasonXP || 0,
          level: entry.level || 1,
          rank: entry.rank || index + 1,
          avatar: entry.user?.avatar || undefined,
          subjectId: entry.subjectId || undefined,
          subject: entry.subject || undefined,
          levelRange: levelRangeStr
        };
      });
    }

    // Global leaderboard - use User table
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalXP: true,
        studyXP: true,
        taskXP: true,
        examXP: true,
        challengeXP: true,
        questXP: true,
        seasonXP: true,
        level: true,
        avatar: true
      },
      orderBy: { totalXP: 'desc' },
      take: limit
    });

    return users.map((user: { id: string; username: string | null; totalXP: number | null; studyXP: number | null; taskXP: number | null; examXP: number | null; challengeXP: number | null }, index: number) => ({
      userId: user.id,
      username: user.username || 'مستخدم مجهول',
      totalXP: user.totalXP || 0,
      studyXP: user.studyXP || 0,
      taskXP: user.taskXP || 0,
      examXP: user.examXP || 0,
      challengeXP: user.challengeXP || 0,
      questXP: (user as { questXP?: number | null }).questXP || 0,
      seasonXP: (user as { seasonXP?: number | null }).seasonXP || 0,
      level: (user as { level?: number | null }).level || 1,
      rank: index + 1,
      avatar: (user as { avatar?: string | null }).avatar || undefined
    }));
  }

  async updateLeaderboardEntry(
    userId: string,
    type: 'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' | 'level',
    xpData: {
      totalXP?: number;
      studyXP?: number;
      taskXP?: number;
      examXP?: number;
      challengeXP?: number;
      questXP?: number;
      seasonXP?: number;
    },
    options: {
      period?: string;
      subject?: string;
      levelRange?: string;
      seasonId?: string;
    } = {}
  ): Promise<void> {
    const { period, subject, levelRange, seasonId } = options;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Try to find existing entry
    const existing = await prisma.leaderboardEntry.findFirst({
      where: {
        userId,
        type,
        period: period || null,
        subjectId: subject || null,
        levelRange: levelRange || null,
        seasonId: seasonId || null
      }
    });

    const data = {
      userId,
      type,
      period: period || null,
      subjectId: subject || null,
      levelRange: levelRange || null,
      seasonId: seasonId || null,
      totalXP: xpData.totalXP ?? user.totalXP ?? 0,
      studyXP: xpData.studyXP ?? user.studyXP ?? 0,
      taskXP: xpData.taskXP ?? user.taskXP ?? 0,
      examXP: xpData.examXP ?? user.examXP ?? 0,
      challengeXP: xpData.challengeXP ?? user.challengeXP ?? 0,
      questXP: xpData.questXP ?? user.questXP ?? 0,
      seasonXP: xpData.seasonXP ?? user.seasonXP ?? 0,
      level: user.level ?? 1
    };

    if (existing) {
      await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data
      });
    } else {
      await prisma.leaderboardEntry.create({ data });
    }
  }

  // ===== Rewards System =====
  async awardReward(userId: string, rewardId: string, source: string, nftTokenId?: string): Promise<void> {
    await prisma.userReward.create({
      data: {
        userId,
        rewardId,
        source,
        nftTokenId
      }
    });
  }

  async getUserRewards(userId: string): Promise<Reward[]> {
    const userRewards = await prisma.userReward.findMany({
      where: { userId },
      include: {
        reward: true
      }
    });

    return userRewards.map((ur: { reward: { id: string; name: string; description: string | null; type: string; rarity: string | null; imageUrl?: string | null; metadata?: unknown } }) => ({
      id: ur.reward.id,
      name: ur.reward.name,
      description: ur.reward.description || '',
      type: ur.reward.type as Reward['type'],
      rarity: ur.reward.rarity as Reward['rarity'],
      imageUrl: ur.reward.imageUrl || undefined,
      metadata: ur.reward.metadata
    }));
  }

  // ===== Helper Methods =====
  private calculateLevel(totalXP: number): number {
    // Level calculation: each level requires 100 XP more than the previous
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  getPeriodString(type: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    switch (type) {
      case 'daily':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      case 'weekly': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      case 'monthly':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}

export const advancedGamificationService = AdvancedGamificationService.getInstance();

