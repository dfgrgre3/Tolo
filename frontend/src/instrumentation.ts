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
      ensureValidEnvironment({ fatal: false });
      
      const originalError = console.error;
      const originalWarn = console.warn;
      let isIntercepting = false;
      
      console.error = (...args) => {
        if (!isIntercepting && process.env.NODE_ENV === 'production') {
          isIntercepting = true;
          try {
            logger.error('Intercepted Console Error', new Error(args.map(a => String(a)).join(' ')));
          } finally {
            isIntercepting = false;
          }
        }
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        const warnMsg = args.map(a => String(a)).join(' ');
        if (!isIntercepting && process.env.NODE_ENV === 'production') {
          isIntercepting = true;
          try {
            logger.warn('Intercepted Console Warning', { details: args });
          } finally {
            isIntercepting = false;
          }
        }
        originalWarn.apply(console, args);
      };

      logger.info('System Foundation: Environment validated.');
    } catch (error) {
       logger.error('CRITICAL: System Startup Failed', error instanceof Error ? error : new Error(String(error)));
       if (process.env.NODE_ENV === 'production') process.exit(1);
    }
  }
}
