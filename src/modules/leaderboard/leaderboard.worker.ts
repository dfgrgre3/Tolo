import { leaderboardService } from './leaderboard.service';
import { logger } from '@/lib/logger';

/**
 * Leaderboard Sync Worker.
 * Periodically re-syncs the Redis Sorted Set from PostgreSQL to ensure accuracy.
 * Recommended frequency: Once per hour for 1M+ active users.
 */
export async function startLeaderboardWorker() {
  const INTERVAL = 3600000; // 1 Hour

  logger.info('Leaderboard Sync Worker started.');

  const runSync = async () => {
    try {
      await leaderboardService.warmUpCache();
      logger.info('Leaderboard background sync completed successfully.');
    } catch (error) {
      logger.error('CRITICAL: Leaderboard Sync Worker failed:', error);
    }
  };

  // Immediate first run
  await runSync();

  // Periodic schedule
  setInterval(runSync, INTERVAL);
}
