/**
 * GamificationService - Facade for decomposed services
 * This file maintains the legacy singleton structure while delegating to specialized services.
 */

import { xpService } from './gamification/xp-service';
import { achievementService } from './gamification/achievement-service';
import { leaderboardService } from './gamification/leaderboard-service';
import { progressionService } from './gamification/progression-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import redisService from '@/lib/redis';
import {
  Achievement,
  UserProgress,
  Season,
  Challenge,
  QuestChain,
  Quest,
  LeaderboardEntry,
  Reward,
  CustomGoal
} from './gamification/types';

import { gamificationQueue } from '@/lib/queue/bullmq';

export type { Achievement, UserProgress, Season, Challenge, QuestChain, Quest, LeaderboardEntry, Reward, CustomGoal };

export class GamificationService {
  private static instance: GamificationService;

  private constructor() {}

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  // ===== Progress & XP (Delegated to XPService) =====
  
  async addXP(userId: string, amount: number, type?: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season'): Promise<void> {
    // Invalidate cache before adding XP
    await redisService.del(`user:${userId}:gamification:progress`);
    return xpService.addXP(userId, amount, type);
  }

  async calculateStreak(userId: string): Promise<number> {
    return xpService.calculateStreak(userId);
  }

  public calculateLevel(totalXP: number): number {
    return xpService.calculateLevel(totalXP);
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const cacheKey = `user:${userId}:gamification:progress`;
    
    return redisService.getOrSet(cacheKey, async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          achievements: true,
          customGoals: true,
          xp: true,
          activity: true
        }
      });

      if (!user) {
        return {
          userId,
          totalXP: 0,
          level: 1,
          nextLevelXP: xpService.getXPForLevel(2),
          progressToNextLevel: 0,
          achievements: [],
          currentStreak: 0,
          longestStreak: 0,
          totalStudyTime: 0,
          tasksCompleted: 0,
          examsPassed: 0,
          customGoals: []
        };
      }

      const totalXP = user.xp?.totalXP || 0;
      const level = user.xp?.level || xpService.calculateLevel(totalXP);
      const xpForCurrentLevel = xpService.getXPForLevel(level);
      const xpForNextLevel = xpService.getXPForLevel(level + 1);

      return {
        userId,
        totalXP,
        level,
        nextLevelXP: xpForNextLevel,
        progressToNextLevel: ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100,
        achievements: user.achievements.map((a: { achievementKey: string }) => a.achievementKey),
        currentStreak: user.activity?.currentStreak || 0,
        longestStreak: user.activity?.longestStreak || 0,
        studyXP: user.xp?.studyXP || 0,
        taskXP: user.xp?.taskXP || 0,
        examXP: user.xp?.examXP || 0,
        challengeXP: user.xp?.challengeXP || 0,
        questXP: user.xp?.questXP || 0,
        seasonXP: user.xp?.seasonXP || 0,
        totalStudyTime: user.activity?.totalStudyTime || 0,
        tasksCompleted: user.activity?.tasksCompleted || 0,
        examsPassed: user.activity?.examsPassed || 0,
        customGoals: user.customGoals as unknown as CustomGoal[] || []
      };
    }, 600); // 10 minutes cache
  }

  async updateUserProgress(userId: string, action: string, data: Record<string, unknown>): Promise<UserProgress> {
    try {
      // Invalidate cache immediately on action
      await redisService.del(`user:${userId}:gamification:progress`);
      
      // Enqueue the action for asynchronous background processing
      await gamificationQueue.addJob('PROCESS_ACTION', { userId, action, data });
    } catch (error) {
      logger.error(`[GamificationService] Failed to enqueue action ${action} for user ${userId}:`, error);
      // Fallback is implicitly handled by not failing the request, 
      // but in production we might want to retry or process sync.
    }
    
    return this.getUserProgress(userId);
  }

  // ===== Achievements (Delegated to AchievementService) =====

  public getAllAchievements(): Achievement[] {
    return achievementService.getAllAchievements();
  }

  public getAchievement(key: string): Achievement | undefined {
    return achievementService.getAchievement(key);
  }

  async unlockAchievement(userId: string, achievementKey: string): Promise<boolean> {
    return achievementService.unlockAchievement(userId, achievementKey);
  }

  async awardAchievement(userId: string, achievementKey: string): Promise<boolean> {
      return achievementService.unlockAchievement(userId, achievementKey);
  }

  // ===== Seasons, Challenges & Quests (Delegated to ProgressionService) =====

  async getActiveSeason(): Promise<Season | null> {
    return progressionService.getActiveSeason();
  }

  async getActiveChallenges(type?: string): Promise<Challenge[]> {
    return progressionService.getActiveChallenges(type as any);
  }

  async getActiveQuestChains(): Promise<QuestChain[]> {
    return progressionService.getActiveQuestChains();
  }

  // ===== Leaderboards (Delegated to LeaderboardService) =====

  async getLeaderboard(type?: string, limit?: number, options?: Record<string, unknown>): Promise<LeaderboardEntry[]> {
    return leaderboardService.getLeaderboard(type as any, limit, options);
  }

  // ===== Custom Goals (Delegated to ProgressionService) =====

  async createCustomGoal(userId: string, data: Record<string, unknown>): Promise<CustomGoal> {
    return progressionService.createCustomGoal(userId, data);
  }

  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    return progressionService.updateCustomGoal(goalId, currentValue);
  }

  async deleteCustomGoal(goalId: string): Promise<void> {
    return progressionService.deleteCustomGoal(goalId);
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<unknown> {
    return progressionService.updateQuestProgress(userId, questId, progress);
  }

  async getAvailableRewards(limit?: number): Promise<Reward[]> {
    return progressionService.getAvailableRewards(limit);
  }

  async claimReward(userId: string, rewardId: string): Promise<unknown> {
    return progressionService.claimReward(userId, rewardId);
  }
}

export const gamificationService = GamificationService.getInstance();
export default gamificationService;
