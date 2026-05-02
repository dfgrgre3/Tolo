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

      const registerCleanup = (name: string, fn: any, priority: number = 0) => {
        logger.info(`[Instrumentation] Dummy cleanup registered for: ${name}`);
      };

      // 2. Worker Initialization
      await import('./modules/notifications/notification.worker');

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

      // 5. Global Console Bridge (Ensures all errors are captured by Unified Logger)
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.error = (...args) => {
        if (process.env.NODE_ENV === 'production') {
          logger.error('Intercepted Console Error', new Error(args.map(a => String(a)).join(' ')));
        }
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        const warnMsg = args.map(a => String(a)).join(' ');
        if (warnMsg.includes('Eviction policy is volatile-lru')) {
          return; // Suppress BullMQ eviction policy warning
        }
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Intercepted Console Warning', { details: args });
        }
        originalWarn.apply(console, args);
      };

      logger.info('System Foundation: Environment validated, Notification Workers active.');
    } catch (error) {
       logger.error('CRITICAL: System Startup Failed', error instanceof Error ? error : new Error(String(error)));
       if (process.env.NODE_ENV === 'production') process.exit(1);
    }
  }
}
