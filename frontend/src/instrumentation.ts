/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts
 * Used for environment validation and core system health
 */
import * as Sentry from '@sentry/nextjs';

/**
 * Adaptive trace sampling with an explicit error-trace budget.
 *
 * - Override per environment via SENTRY_TRACES_SAMPLE_RATE (0..1).
 * - Default is 1.0 outside production (full local visibility) and 0.1 in
 *   production (cost/volume budget at scale; errors are still captured at
 *   100% — this rate only governs performance traces).
 */
function tracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
}

export async function register() {
  // Sentry's Next.js integration expects initialization from the runtime
  // instrumentation hook. Keeping the runtime-specific config imports here
  // avoids duplicate initialization and supports both Node and Edge.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
      tracesSampleRate: tracesSampleRate(),
      debug: false,
    });
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
      tracesSampleRate: tracesSampleRate(),
      debug: false,
    });
  }

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

export const onRequestError = Sentry.captureRequestError;
