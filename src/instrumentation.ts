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
      
      // 2. Automate DB Partition Management (Ensures future partitions exist)
      const { DataPartitioningService } = await import('./lib/data-partitioning-service');
      DataPartitioningService.checkAndExtendPartitionsIfNeeded()
        .then(result => {
          if (result.triggeredActions.length > 0) {
            logger.info('DB Partitions: Lifecycle management executed.', { actions: result.triggeredActions });
          }
        })
        .catch(err => logger.error('DB Partitions: Automated management failed.', err));

      await import('./modules/notifications/notification.worker');

      // 3. Global Console Bridge (Ensures all errors are captured by Unified Logger)
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

      logger.info('System Foundation: Environment validated and Console Bridge active.');
    } catch (error) {
       logger.error('CRITICAL: System Startup Failed', error instanceof Error ? error : new Error(String(error)));
       if (process.env.NODE_ENV === 'production') process.exit(1);
    }
  }
}

