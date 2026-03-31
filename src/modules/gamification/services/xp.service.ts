import { statsRepository } from '../repositories/stats.repository';
import { logger } from '@/lib/logger';
import { CacheService } from '@/lib/cache';
import { gamificationQueue } from '@/lib/queue/bullmq';

export type XPUpdateType = 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season';

export class XPService {
  /**
   * Enqueue an XP update asynchronously to avoid blocking the main API response.
   */
  async enqueueXPUpdate(userId: string, amount: number, type: XPUpdateType) {
    logger.debug(`Enqueuing XP update for user ${userId}: +${amount} (${type})`);
    
    // Low-latency API response: Enqueue and return immediately
    await gamificationQueue.addJob('ADD_XP', {
      type: 'ADD_XP',
      userId,
      amount,
      xpType: type,
    });
  }

  /**
   * High-frequency processing (the actual database write worker).
   */
  async processXPUpdate(userId: string, amount: number, type: XPUpdateType) {
    const xpFieldMap: Record<XPUpdateType, string> = {
      study: 'studyXP',
      task: 'taskXP',
      exam: 'examXP',
      challenge: 'challengeXP',
      quest: 'questXP',
      season: 'seasonXP'
    };

    const xpField = xpFieldMap[type];

    // 1. Atomic database increment
    const stats = await statsRepository.incrementUserXP(userId, amount, xpField);

    // 2. Check for Level Up
    const newLevel = this.calculateLevel(stats.totalXP);
    if (newLevel > stats.level) {
      await statsRepository.updateUserLevel(userId, newLevel);
      logger.info(`User ${userId} leveled up to ${newLevel}!`);
      
      // Invalidate cache for user profile/stats
      await CacheService.del(`user:stats:${userId}`);
      
      // Optional: Emit celebration via SSE or WebSocket
    }

    // 3. Cache the updated stats for fast reads (TTL 5 mins)
    await CacheService.set(`user:stats:${userId}`, {
      ...stats,
      level: Math.max(stats.level, newLevel),
      updatedAt: Date.now()
    }, 300);

    return stats;
  }

  private calculateLevel(totalXP: number): number {
    // RPG-style level calculation (Linear with exponent for scaling)
    // Example: Lvl 1 = 0 XP, Lvl 2 = 1000 XP, Lvl 3 = 2500 XP, etc.
    if (totalXP < 1000) return 1;
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }
  
  async getUserStats(userId: string) {
    // Cache-aside logic for fast reads
    return await CacheService.getOrSet(`user:stats:${userId}`, async () => {
      return await statsRepository.getStats(userId);
    }, 600);
  }
}

export const xpService = new XPService();
