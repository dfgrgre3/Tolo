/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts
 * Used for environment validation and core system health
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. Core Service Initialization
    const { ensureValidEnvironment } = await import('./lib/env-validation');
    const { logger } = await import('./lib/logger');
    
    try {
      ensureValidEnvironment();

      // 2. Graceful Shutdown (Zero-Downtime Deployments)
      const { initGracefulShutdown, registerCleanup } = await import('./lib/graceful-shutdown');
      initGracefulShutdown(25_000);

      // Register cleanup handlers in priority order
      // Priority 10: Stop accepting new work
      registerCleanup('NotificationWorker', async () => {
        try {
          // Workers will be stopped by their module's cleanup
          logger.info('[Shutdown] Notification workers signaled to stop');
        } catch {
          logger.warn('[Shutdown] Notification worker cleanup skipped');
        }
      }, 10);

      // Priority 20: Close queues
      registerCleanup('BullMQ Queues', async () => {
        try {
          const { gamificationQueue, notificationQueue, analyticsQueue, referralQueue } = await import('./lib/queue/bullmq');
          await Promise.allSettled([
            gamificationQueue.getInternalQueue().close(),
            notificationQueue.getInternalQueue().close(),
            analyticsQueue.getInternalQueue().close(),
            referralQueue.getInternalQueue().close(),
          ]);
        } catch {
          logger.warn('[Shutdown] Queue cleanup skipped');
        }
      }, 20);

      // Priority 30: Close Redis
      registerCleanup('Redis', async () => {
        try {
          const { getRedisClient } = await import('./lib/cache');
          const client = await getRedisClient();
          if (client) await client.quit();
        } catch {
          logger.warn('[Shutdown] Redis cleanup skipped');
        }
      }, 30);

      // Priority 40: Close database
      registerCleanup('Prisma/PostgreSQL', async () => {
        try {
          const { prisma } = await import('./lib/db');
          await prisma.$disconnect();
        } catch {
          logger.warn('[Shutdown] Database cleanup skipped');
        }
      }, 40);
      
      // 3. Database Health Monitor (Proactive Pool Exhaustion Detection)
      const { DatabaseHealthMonitor } = await import('./lib/db-health');
      DatabaseHealthMonitor.start(30_000); // Check every 30 seconds
      registerCleanup('DB Health Monitor', async () => {
        DatabaseHealthMonitor.stop();
      }, 5);

      // 4. Automate DB Partition Management (Ensures future partitions exist)
      const { DataPartitioningService } = await import('./lib/data-partitioning-service');
      DataPartitioningService.checkAndExtendPartitionsIfNeeded()
        .then(result => {
          if (result.triggeredActions.length > 0) {
            logger.info('DB Partitions: Lifecycle management executed.', { actions: result.triggeredActions });
          }
        })
        .catch(err => logger.error('DB Partitions: Automated management failed.', err));

      await import('./modules/notifications/notification.worker');

      // 5. Global Console Bridge (Ensures all errors are captured by Unified Logger)
      if (process.env.NODE_ENV === 'production') {
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.error = (...args) => {
          logger.error('Intercepted Console Error', new Error(args.map(a => String(a)).join(' ')));
          originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
          logger.warn('Intercepted Console Warning', { details: args });
          originalWarn.apply(console, args);
        };
      }

      logger.info('System Foundation: Environment validated, Graceful Shutdown active, DB Health Monitor running.');
    } catch (error) {
       logger.error('CRITICAL: System Startup Failed', error instanceof Error ? error : new Error(String(error)));
       if (process.env.NODE_ENV === 'production') process.exit(1);
    }
  }
}

