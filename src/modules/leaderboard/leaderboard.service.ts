import redisService from '@/lib/redis';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface LeaderboardPlayer {
  id: string;
  xp: number;
  name: string;
  rank: number;
}

/**
 * --- LEADERBOARD SERVICE ---
 * 
 * High performance leaderboard using Redis Sorted Sets (ZSET).
 * This provides O(log(N)) ranking and O(1) score lookups.
 */
export class LeaderboardService {
  private static GLOBAL_KEY = 'leaderboard:global-v1';
  private static CACHE_TTL = 3600; // 1h

  /**
   * Fast retrieval from Redis ZSET. 
   * Goal: Latency < 50ms for top lists even with 1M users.
   */
  async getTopUsers(limit: number = 10): Promise<LeaderboardPlayer[]> {
    const redis = await redisService.getClient();
    
    // 1. Get user IDs and scores from Redis Sorted Set
    const results = await redis.zrevrange(LeaderboardService.GLOBAL_KEY, 0, limit - 1, 'WITHSCORES');
    
    if (results.length === 0) {
      // Lazy warm up of the cache from DB if empty
      await this.warmUpCache();
      // Retry after warm up
      const retryResults = await redis.zrevrange(LeaderboardService.GLOBAL_KEY, 0, limit - 1, 'WITHSCORES');
      if (retryResults.length === 0) return [];
    }

    const leaderboardItems = results.length > 0 ? results : [];
    const players: LeaderboardPlayer[] = [];
    
    for (let i = 0; i < leaderboardItems.length; i += 2) {
      const userId = leaderboardItems[i];
      const score = parseInt(leaderboardItems[i+1]);
      
      // Fetch minimal user info from cache (profile cache)
      const user = await redisService.get<any>(`user:${userId}:profile`);
      
      players.push({
        id: userId,
        xp: score,
        name: user?.name || user?.username || 'Student',
        rank: (i / 2) + 1
      });
    }

    return players;
  }

  /**
   * Updates a single user's rank. Called by XPService async worker.
   */
  async updateRank(userId: string, xp: number) {
    const redis = await redisService.getClient();
    await redis.zadd(LeaderboardService.GLOBAL_KEY, xp, userId);
  }

  /**
   * Disaster recovery: Re-sync Redis from PostgreSQL.
   * Periodically run by LeaderboardWorker via BullMQ.
   */
  async warmUpCache() {
    logger.info('[Leaderboard] Warming up cache from DB...');
    
    const topXp = await prisma.userXP.findMany({
      orderBy: { totalXP: 'desc' },
      take: 5000, // Sync top 5k users for maximum coverage
      select: { userId: true, totalXP: true }
    });

    const redis = await redisService.getClient();
    const pipeline = redis.pipeline();
    
    // Clear old data to prevent stale ranks
    pipeline.del(LeaderboardService.GLOBAL_KEY);
    
    for (const entry of topXp) {
      pipeline.zadd(LeaderboardService.GLOBAL_KEY, entry.totalXP, entry.userId);
    }

    await pipeline.exec();
    logger.info(`[Leaderboard] Cache warmed successfully with ${topXp.length} entries.`);
  }

  /**
   * Get specific user's global rank in O(1).
   */
  async getUserRank(userId: string) {
    const redis = await redisService.getClient();
    const rank = await redis.zrevrank(LeaderboardService.GLOBAL_KEY, userId);
    return rank !== null ? rank + 1 : null;
  }
}

export const leaderboardService = new LeaderboardService();
export default leaderboardService;
