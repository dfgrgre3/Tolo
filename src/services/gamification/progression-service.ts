import { prisma } from '@/lib/db';

import { Season, Challenge, QuestChain, Reward, CustomGoal } from './types';
import { xpService } from './xp-service';

export class ProgressionService {
  private static instance: ProgressionService;

  private constructor() {}

  public static getInstance(): ProgressionService {
    if (!ProgressionService.instance) {
      ProgressionService.instance = new ProgressionService();
    }
    return ProgressionService.instance;
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
      rewards: season.rewards as any
    } : null;
  }

  // ===== Challenges =====
  async getActiveChallenges(type?: 'daily' | 'weekly' | 'monthly'): Promise<Challenge[]> {
    const now = new Date();
    const where: any = {
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
      difficulty: c.difficulty as any || 'medium',
      xpReward: c.xpReward,
      requirements: c.requirements as any || {},
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
        requirements: q.requirements as any || {},
        prerequisites: q.prerequisites as any || undefined
      }))
    }));
  }

  // ===== Custom Goals =====
  async createCustomGoal(userId: string, data: Partial<CustomGoal>): Promise<CustomGoal> {
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
        isCompleted: false
      }
    });
    return result as unknown as CustomGoal;
  }

  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
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

    if (isCompleted && !goal.isCompleted) {
      await xpService.addXP(goal.userId, (updatedGoal as unknown as any).xpReward, 'task');
    }

    return updatedGoal as unknown as CustomGoal;
  }

  async deleteCustomGoal(goalId: string): Promise<void> {
    await prisma.customGoal.delete({ where: { id: goalId } });
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<any> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const isCompleted = progress >= 100;
    const result = await prisma.questProgress.upsert({
      where: { userId_questId: { userId, questId } },
      create: {
        userId,
        questId,
        chainId: quest.chainId,
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      update: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    if (isCompleted) {
      await xpService.addXP(userId, quest.xpReward, 'quest');
    }

    return result;
  }

  // ===== Rewards =====
  async getAvailableRewards(limit: number = 20): Promise<Reward[]> {
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      take: limit,
      orderBy: { rarity: 'desc' }
    });

    return rewards.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      type: r.type as any,
      rarity: r.rarity as any,
      imageUrl: r.imageUrl || undefined,
      metadata: r.metadata as any || undefined
    }));
  }

  async claimReward(userId: string, rewardId: string): Promise<any> {
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new Error('Reward not found');

    const result = await prisma.userReward.create({
      data: {
        userId,
        rewardId,
        source: 'manual_claim'
      }
    });

    return result;
  }
}

export const progressionService = ProgressionService.getInstance();