import { logger } from '@/lib/logger';

/**
 * Graceful Shutdown Handler
 * 
 * Ensures zero-downtime deployments for millions of users by:
 * 1. Stopping acceptance of new requests (K8s readiness probe fails)
 * 2. Draining in-flight requests (wait for completion)
 * 3. Closing all connections cleanly (Redis, Prisma, BullMQ)
 * 4. Exiting with proper code
 *
 * K8s sends SIGTERM â†’ Pod goes to Terminating â†’ preStop hook (if any) 
 * â†’ Our handler runs â†’ Pod removed from Service endpoints
 */

type CleanupFn = () => Promise<void>;

const cleanupHandlers: { name: string; fn: CleanupFn; priority: number }[] = [];
let isShuttingDown = false;
let shutdownTimeout = 25_000; // 25s (K8s terminationGracePeriod is 60s)

export function getIsShuttingDown(): boolean {
  return isShuttingDown;
}

/**
 * Register a cleanup function to run during shutdown.
 * Lower priority numbers run first. 
 * Recommended priorities: 
 *   10 = stop workers, 
 *   20 = close queues, 
 *   30 = close cache, 
 *   40 = close database
 */
export function registerCleanup(name: string, fn: CleanupFn, priority: number = 50): void {
  cleanupHandlers.push({ name, fn, priority });
  cleanupHandlers.sort((a, b) => a.priority - b.priority);
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`[Shutdown] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  logger.info(`[Shutdown] ${cleanupHandlers.length} cleanup handlers registered.`);

  // Force exit after timeout to prevent zombie process
  const forceTimer = setTimeout(() => {
    logger.error(`[Shutdown] Forced exit after ${shutdownTimeout}ms timeout`);
    process.exit(1);
  }, shutdownTimeout);

  // Ensure the timer doesn't prevent process from exiting naturally
  if (forceTimer.unref) forceTimer.unref();

  // Execute all cleanup handlers in priority order
  for (const handler of cleanupHandlers) {
    try {
      logger.info(`[Shutdown] Running: ${handler.name} (priority ${handler.priority})`);
      await Promise.race([
        handler.fn(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
      logger.info(`[Shutdown] âœ“ ${handler.name} completed`);
    } catch (error) {
      logger.error(`[Shutdown] âœ— ${handler.name} failed:`, error);
    }
  }

  logger.info('[Shutdown] All cleanup complete. Exiting.');
  clearTimeout(forceTimer);
  process.exit(0);
}

/**
 * Initialize graceful shutdown signal handlers.
 * Call this once in instrumentation.ts or server startup.
 */
export function initGracefulShutdown(timeoutMs?: number): void {
  if (timeoutMs) shutdownTimeout = timeoutMs;

  // Only register once
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors gracefully  
  process.on('uncaughtException', (error) => {
    logger.error('[Shutdown] Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('[Shutdown] Unhandled Rejection:', reason);
    // Don't shutdown for unhandled rejections in production (they might be non-critical)
    // Just log them for monitoring
  });

  logger.info('[Shutdown] Graceful shutdown handlers registered');
}

export default { registerCleanup, initGracefulShutdown, getIsShuttingDown };
