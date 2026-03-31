import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { LeaderboardEntry } from './types';
import { CacheService } from '@/lib/cache';
import { logger } from '@/lib/logger';

export class LeaderboardService {
  private static instance: LeaderboardService;

  private constructor() {}

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  async getLeaderboard(
    type: 'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' = 'global',
    limit: number = 50,
    options: { subjectId?: string; seasonId?: string; period?: string } = {}
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${type}:${limit}:${options.subjectId || 'none'}:${options.seasonId || 'none'}:${options.period || 'none'}`;
    
    try {
      const cachedData = await CacheService.get<LeaderboardEntry[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    } catch (err) {
      logger.error('Leaderboard Cache Error:', err);
    }

    let results: LeaderboardEntry[] = [];
    
    if (type === 'global') {
      const stats = await prisma.userXP.findMany({
        select: {
          userId: true,
          totalXP: true,
          level: true,
          user: {
            select: {
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { totalXP: 'desc' },
        take: limit
      });

      results = stats.map((s: any, i: number) => ({
        userId: s.userId,
        username: s.user?.username || 'طالب مجهول',
        totalXP: s.totalXP || 0,
        level: s.level || 1,
        rank: i + 1,
        avatar: s.user?.avatar || undefined
      }));
    } else {
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

      results = entries.map((e: any, i: number) => ({
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

    try {
      await CacheService.set(cacheKey, results, 300); // 5 minutes cache
    } catch (err) {
      logger.error('Failed to set leaderboard cache:', err);
    }

    return results;
  }
}

export const leaderboardService = LeaderboardService.getInstance();
