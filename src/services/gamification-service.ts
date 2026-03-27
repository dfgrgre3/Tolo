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
  
  async addXP(userId: string, amount: number, type?: any): Promise<void> {
    return xpService.addXP(userId, amount, type);
  }

  async calculateStreak(userId: string): Promise<number> {
    return xpService.calculateStreak(userId);
  }

  public calculateLevel(totalXP: number): number {
    return xpService.calculateLevel(totalXP);
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        customGoals: true
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

    const totalXP = user.totalXP || 0;
    const level = xpService.calculateLevel(totalXP);
    const xpForCurrentLevel = xpService.getXPForLevel(level);
    const xpForNextLevel = xpService.getXPForLevel(level + 1);

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
      customGoals: user.customGoals as any[] || []
    };
  }

  async updateUserProgress(userId: string, action: string, data: any): Promise<UserProgress> {
    switch (action) {
      case 'exam_completed':
        const score = data?.score || 0;
        let xp = 100;
        if (score >= 90) xp += 100;
        else if (score >= 75) xp += 50;
        await xpService.addXP(userId, xp, 'exam');
        if (score === 100) await achievementService.unlockAchievement(userId, 'QUIZ_MASTER');
        break;

      case 'study_session_completed':
        const duration = data?.duration || 0;
        await xpService.addXP(userId, Math.floor(duration / 10), 'study');
        await achievementService.unlockAchievement(userId, 'STUDY_SESSION_COMPLETED');
        break;

      case 'task_completed':
        await xpService.addXP(userId, 20, 'task');
        break;
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

  async getActiveChallenges(type?: any): Promise<Challenge[]> {
    return progressionService.getActiveChallenges(type);
  }

  async getActiveQuestChains(): Promise<QuestChain[]> {
    return progressionService.getActiveQuestChains();
  }

  // ===== Leaderboards (Delegated to LeaderboardService) =====

  async getLeaderboard(type?: any, limit?: number, options?: any): Promise<LeaderboardEntry[]> {
    return leaderboardService.getLeaderboard(type, limit, options);
  }

  // ===== Custom Goals (Delegated to ProgressionService) =====

  async createCustomGoal(userId: string, data: any): Promise<CustomGoal> {
    return progressionService.createCustomGoal(userId, data);
  }

  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    return progressionService.updateCustomGoal(goalId, currentValue);
  }

  async deleteCustomGoal(goalId: string): Promise<void> {
    return progressionService.deleteCustomGoal(goalId);
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<any> {
    return progressionService.updateQuestProgress(userId, questId, progress);
  }

  async getAvailableRewards(limit?: number): Promise<Reward[]> {
    return progressionService.getAvailableRewards(limit);
  }

  async claimReward(userId: string, rewardId: string): Promise<any> {
    return progressionService.claimReward(userId, rewardId);
  }
}

export const gamificationService = GamificationService.getInstance();
export default gamificationService;
