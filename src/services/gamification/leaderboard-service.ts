import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { LeaderboardEntry } from './types';
import { CacheService, getRedisClient } from '@/lib/cache';
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
    const redisKey = type === 'global' ? 'leaderboard:global' : `leaderboard:${type}:${options.subjectId || options.seasonId || 'scoped'}`;
    const cacheKey = `leaderboard:cache:${type}:${limit}:${options.subjectId || 'none'}:${options.seasonId || 'none'}:${options.period || 'none'}`;
    
    try {
      // 1. Check Pre-formatted L1/L2 Cache (5 minutes)
      const cachedData = await CacheService.get<LeaderboardEntry[]>(cacheKey);
      if (cachedData) return cachedData;

      // 2. Real-Time Retrieval from Redis ZSET (High Performance O(log N))
      const redis = await getRedisClient();
      if (redis) {
        const topPairs = await redis.zrevrange(redisKey, 0, limit - 1, 'WITHSCORES');
        
        if (topPairs.length > 0) {
          const results: LeaderboardEntry[] = [];
          const userIds: string[] = [];
          const scores: Record<string, number> = {};

          for (let i = 0; i < topPairs.length; i += 2) {
            const userId = topPairs[i];
            const score = parseInt(topPairs[i + 1], 10);
            userIds.push(userId);
            scores[userId] = score;
          }

          // Batch fetch user profiles from Cache or DB
          const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, avatar: true, xp: { select: { level: true } } }
          });

          // Maintain order from Redis
          userIds.forEach((id, index) => {
            const user = users.find((u: any) => u.id === id);
            if (user) {
              results.push({
                userId: id,
                username: user.username || 'طالب مجهول',
                totalXP: scores[id],
                level: user.xp?.level || 1,
                rank: index + 1,
                avatar: user.avatar || undefined
              });
            }
          });

          if (results.length > 0) {
            await CacheService.set(cacheKey, results, 300);
            return results;
          }
        }
      }
    } catch (err) {
      logger.error('Leaderboard Scale Engine Error:', err);
    }

    // 3. Fallback to SQL (Only for cold start or non-indexed custom periods)
    logger.info(`[Leaderboard] Falling back to SQL engine for type: ${type}`);
    let results: LeaderboardEntry[] = [];
    
    if (type === 'global') {
      const stats = await prisma.userXP.findMany({
        select: {
          userId: true,
          totalXP: true,
          level: true,
          user: { select: { username: true, avatar: true } }
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

      const redis = await getRedisClient();
      if (redis) {
          const pipeline = redis.pipeline();
          stats.forEach((s: any) => pipeline.zadd('leaderboard:global', s.totalXP, s.userId));
          await pipeline.exec().catch(() => {});
      }
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
      }));
    }

    await CacheService.set(cacheKey, results, 300);
    return results;
  }
}

export const leaderboardService = LeaderboardService.getInstance();
