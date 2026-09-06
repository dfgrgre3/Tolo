/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts
 * Used for environment validation and core system health
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureValidEnvironment } = await import('./lib/env-validation');
    const { logger } = await import('./lib/logger');
    
    try {
      ensureValidEnvironment({ fatal: true });

      logger.info('System Foundation: Environment validated.');
    } catch (error) {
       logger.error('CRITICAL: System Startup Failed', error instanceof Error ? error : new Error(String(error)));
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') process.exit(1);
    }
  }
}
