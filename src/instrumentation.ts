/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts
 * Used for environment validation and initialization
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and validate environment variables on server startup
    const { ensureValidEnvironment } = await import('./lib/env-validation');
    const { logger } = await import('./lib/logger');
    
    try {
      ensureValidEnvironment();
      logger.info('Environment validation passed');
    } catch (error) {
      logger.error('Environment validation failed', error instanceof Error ? error : new Error(String(error)));
      // In production, exit the process if environment is invalid
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}

