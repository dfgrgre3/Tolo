import { xpRepository, XPUpdateData } from './xp.repository';
import { logger } from '@/lib/logger';
import { gamificationQueue, enqueueJob } from '@/lib/queue/bullmq';
import redisService from '@/lib/redis';
import { prisma, Prisma } from '@/lib/db';

import { achievementService } from '@/services/gamification/achievement-service';

/**
 * --- GAMIFICATION SERVICE ---
 * 
 * Handles business logic for XP, Levels, and Achievements.
 */
export class XPService {
  private static instance: XPService;

  public static getInstance(): XPService {
    if (!XPService.instance) {
      XPService.instance = new XPService();
    }
    return XPService.instance;
  }

  /**
   * Processes a user action asynchronously.
   * Called by the Gamification Worker.
   */
  async processAction(userId: string, action: string, data: any) {
    switch (action) {
      case 'exam_completed':
        const score = data?.score || 0;
        let examXP = 100;
        if (score >= 90) examXP += 100;
        else if (score >= 75) examXP += 50;
        await this.processXPUpdate({ userId, amount: examXP, type: 'exam' });
        if (score === 100) await achievementService.unlockAchievement(userId, 'QUIZ_MASTER');
        break;

      case 'study_session_completed':
        const duration = data?.duration || 0;
        await this.processXPUpdate({ userId, amount: Math.floor(duration / 10), type: 'study' });
        await achievementService.unlockAchievement(userId, 'STUDY_SESSION_COMPLETED');
        break;

      case 'task_completed':
        await this.processXPUpdate({ userId, amount: 20, type: 'task' });
        break;
    }
  }

  /**
   * High performance XP award (Non-blocking)
   * Goal: API latency < 200ms by offloading calculation to Queue.
   */
  async awardXP(userId: string, amount: number, type: XPUpdateData['type']) {
    try {
      // 1. Enqueue job immediately for background processing
      await enqueueJob(gamificationQueue, 'ADD_XP', { userId, amount, type });
      
      // 2. Optimistic Cache Update (Atomic)
      // Instant UI feedback via distributed counter
      const cacheKey = `user:${userId}:xp`;
      await redisService.incrBy(cacheKey, amount);
      
      return { success: true };
    } catch (error) {
      logger.error(`[XPService] Queue failure for user ${userId}. Falling back to sync.`, error);
      // Synchronous fallback to guarantee data integrity if Redis is down
      return await this.processXPUpdate({ userId, amount, type });
    }
  }

  /**
   * Internal processor called by the BullMQ Worker.
   */
  async processXPUpdate(data: XPUpdateData) {
    const { userId, amount } = data;
    
    try {
        // Atomic DB Update in a Transaction
        const { stats, levelUp, newLevel } = await (prisma as any).$transaction(async (tx: any) => {
          // 1. Atomic XP Update
          const currentStats = await xpRepository.updateStats(data, tx);
          
          // 2. Level calculation logic within the lock
          const currentLevel = currentStats.level;
          const calculatedLevel = this.calculateLevel(currentStats.totalXP);
          
          const isLevelUp = calculatedLevel > currentLevel;
          
          if (isLevelUp) {
            await xpRepository.updateLevel(userId, calculatedLevel, tx);
          }

          return { stats: currentStats, levelUp: isLevelUp, newLevel: calculatedLevel };
        }, {
          isolationLevel: 'ReadCommitted', // Default for PG, sufficient for row-level increment
          timeout: 5000
        });
        
        if (levelUp) {
          // Enqueue secondary events (notifications, achievements check)
          await enqueueJob(gamificationQueue, 'CHECK_ACHIEVEMENTS', { userId });
          logger.info(`[XPService] User ${userId} leveled up to ${newLevel}`);
        }

        // 3. Real-Time Leaderboard Synchronization (Redis ZSET)
        // High Performance: ZADD/ZINCRBY in Redis is O(log N), allowing sub-millisecond ranking for 10M+ users.
        const redis = await redisService.getClient();
        if (redis) {
          // Update Global Leaderboard
          await redis.zadd('leaderboard:global', stats.totalXP, userId);
          
          // Update Type-specific Leaderboards (Optional: only if type is relevant for a split leaderboard)
          if (data.type === 'study' || data.type === 'task') {
             await redis.zincrby(`leaderboard:type:${data.type}`, amount, userId);
          }
        }

        // 4. Cache Invalidation
        await redisService.del(`user:${userId}:profile`);
        await redisService.set(`user:${userId}:xp`, stats.totalXP, 3600);
        
        return { success: true, levelUp };
    } catch (error) {
        logger.error(`[XPService] Critical failure in processXPUpdate:`, error);
        throw error;
    }
  }

  /**
   * Level Formula: 100 * (L * (L+1)) / 2
   */
  public calculateLevel(totalXP: number): number {
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  /**
   * Calculate total XP required to reach a specific level.
   * Inverse of calculateLevel.
   */
  public getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return 50 * (level - 1) * level;
  }

  /**
   * Calculate current streak for a user.
   * Strategy: Fetch from UserActivity model.
   */
  async calculateStreak(userId: string): Promise<number> {
    const activity = await xpRepository.getUserActivity(userId);
    return activity?.currentStreak || 0;
  }
}

export const xpService = XPService.getInstance();
export default xpService;

