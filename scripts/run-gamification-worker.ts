import { GamificationWorker } from '../src/services/worker/gamification-worker';
import { logger } from '../src/lib/logger';

async function main() {
  logger.info('Starting Gamification Worker Process...');
  
  // Handle termination signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down worker...');
    GamificationWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down worker...');
    GamificationWorker.stop();
    process.exit(0);
  });

  try {
    await GamificationWorker.start();
  } catch (error) {
    logger.error('Failed to start Gamification Worker:', error);
    process.exit(1);
  }
}

main();
