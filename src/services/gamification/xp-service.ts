
import { xpService as modularXPService } from '@/modules/gamification/xp.service';
import { logger } from '@/lib/logger';

/**
 * --- DEPRECATED XP SERVICE ---
 * 
 * This file is kept for backward compatibility during the modular monolith refactor.
 * Please use '@/modules/gamification/xp.service' for new code.
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
   * Delegates to the new high-performance modular service
   */
  async addXP(
  userId: string,
  amount: number,
  type: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season' = 'study')
  : Promise<void> {
    try {
      await modularXPService.awardXP(userId, amount, type);
    } catch (error) {
      logger.error(`[LegacyXP] Delegate failed for user ${userId}:`, error);
    }
  }

  /**
   * Internal processor now handled by the Modular Worker
   */
  async commitXPUpdate(
  userId: string,
  amount: number,
  type: 'study' | 'task' | 'exam' | 'challenge' | 'quest' | 'season' = 'study')
  : Promise<void> {
    await modularXPService.processXPUpdate({ userId, amount, type });
  }

  public calculateLevel(totalXP: number): number {
    return modularXPService.calculateLevel(totalXP);
  }

  public getXPForLevel(level: number): number {
    return modularXPService.getXPForLevel(level);
  }

  async calculateStreak(userId: string): Promise<number> {
    return modularXPService.calculateStreak(userId);
  }
}

export const xpService = XPService.getInstance();