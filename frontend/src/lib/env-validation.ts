/**
 * Environment Variables Validation
 * Validates all required environment variables at startup.
 *
 * Contract is enforced via a Zod schema (zod is already a direct dep). The
 * schema is the single source of truth for what each environment needs to
 * be valid; the rest of the checks (NEXT_PUBLIC_ leakage, URL format,
 * SESSION_DURATION) are layered on top.
 */

import { z } from 'zod';
import { logger } from './logger';

/**
 * Production-required server-side secrets / endpoints.
 *
 * These MUST be set in every production deployment. A missing value here
 * fails the contract at startup — see `ensureValidEnvironment()`.
 *
 * - INTERNAL_API_URL          — server-to-server backend base (no /api suffix)
 * - JWT_PUBLIC_KEY            — asymmetric public verification key (production)
 * - JWT_EXPECTED_ISSUER       — required JWT issuer (production)
 * - JWT_EXPECTED_AUDIENCE     — required JWT audience (production)
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or ANON_KEY
 *
 * If neither SUPABASE key is present, the schema accepts an empty
 * `NEXT_PUBLIC_SUPABASE_*` value but logs a warning so a forgotten
 * `.env.local` is loud rather than silent.
 */
const serverEnvSchema = z
  .object({
    INTERNAL_API_URL: z
      .string()
      .url('INTERNAL_API_URL must be a valid URL (e.g. https://api.example.com)'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters')
      .optional(),
    JWT_PUBLIC_KEY: z.string().min(10, 'JWT_PUBLIC_KEY must be a valid PEM public key').optional(),
    JWT_EXPECTED_ISSUER: z.string().min(1, 'JWT_EXPECTED_ISSUER is required').optional(),
    JWT_EXPECTED_AUDIENCE: z.string().min(1, 'JWT_EXPECTED_AUDIENCE is required').optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10).optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10).optional(),
  })
  .superRefine((env, ctx) => {
    if (isProductionEnvironment()) {
      // Production: JWT_PUBLIC_KEY is mandatory, JWT_SECRET is forbidden
      if (!env.JWT_PUBLIC_KEY) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_PUBLIC_KEY is required in production', path: ['JWT_PUBLIC_KEY'] });
      }
      if (!env.JWT_EXPECTED_ISSUER) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_EXPECTED_ISSUER is required in production', path: ['JWT_EXPECTED_ISSUER'] });
      }
      if (!env.JWT_EXPECTED_AUDIENCE) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_EXPECTED_AUDIENCE is required in production', path: ['JWT_EXPECTED_AUDIENCE'] });
      }
      if (env.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is forbidden in production; use JWT_PUBLIC_KEY for edge verification',
          path: ['JWT_SECRET'],
        });
      }
    } else {
      // Non-production: Either JWT_PUBLIC_KEY or JWT_SECRET is required
      if (!env.JWT_PUBLIC_KEY && !env.JWT_SECRET) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_PUBLIC_KEY or JWT_SECRET is required outside production', path: ['JWT_PUBLIC_KEY'] });
      }
      // JWT_SECRET is only allowed in development mode
      if (env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is only allowed in development mode. Use JWT_PUBLIC_KEY for other environments.',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

/**
 * Validation result shape consumed by callers / startup hooks.
 */
interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function checkProductionVars(errors: string[], warnings: string[], isProduction: boolean) {
  if (!isProduction) return;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) {
    // Loud-but-non-fatal warning: Supabase must be configured to use any
    // client-side auth flow. The schema leaves it optional so non-Supabase
    // deployments don't crash, but forgetting to set both keys is a
    // configuration mistake we want surfaced.
    if (
      !parsed.data.NEXT_PUBLIC_SUPABASE_URL &&
      !parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      warnings.push(
        'No Supabase keys configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). ' +
          'Auth and storage will not work until these are set.'
      );
    }
    return;
  }

  for (const issue of parsed.error.issues) {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    errors.push(`${path}: ${issue.message}`);
  }
}

function checkSessionDuration(warnings: string[]) {
  if (process.env.SESSION_DURATION) {
    const duration = parseInt(process.env.SESSION_DURATION, 10);
    if (isNaN(duration) || duration < 60) {
      warnings.push('SESSION_DURATION should be at least 60 seconds');
    }
  }
}

function checkBaseUrl(warnings: string[]) {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL);
    } catch {
      warnings.push('NEXT_PUBLIC_BASE_URL is not a valid URL format');
    }
  }
}

export const PUBLIC_ENV_KEYS = new Set([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_ADMIN_URL',
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_CDN_URL',
    'NEXT_PUBLIC_RP_ID',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_ENABLE_LOGIN_COMPLEXITY',
    // WebSocket & analytics — whitelisted
    'NEXT_PUBLIC_WS_HOST',
    'NEXT_PUBLIC_WS_URL',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST',
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
    'NEXT_PUBLIC_GRPC_URL',
  ]);

export const SERVER_ENV_KEYS = new Set([
  'INTERNAL_API_URL',
  'JWT_SECRET',
  'JWT_PUBLIC_KEY',
  'JWT_PRIVATE_KEY',
  'JWT_EXPECTED_ISSUER',
  'JWT_EXPECTED_AUDIENCE',
  'REDIS_URL',
  'DATABASE_URL',
]);

function checkNoSensitiveKeysExposed(errors: string[], warnings: string[]) {
  for (const rawKey of Object.keys(process.env)) {
    const key = rawKey.trim();
    if (key.startsWith('NEXT_PUBLIC_')) {
      const cleanKey = key.replace(/[^A-Za-z0-9_]/g, '');
      if (PUBLIC_ENV_KEYS.has(key) || PUBLIC_ENV_KEYS.has(cleanKey)) {
        if (key !== rawKey || cleanKey !== key) {
          warnings.push(`Variable ${cleanKey} has invisible or invalid characters in its name.`);
        }
        continue;
      }
      errors.push(`Environment contract violation: ${rawKey} is not declared in PUBLIC_ENV_KEYS.`);
    }
  }
}

/**
 * Validate all environment variables
 */
function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = isProductionEnvironment();

  checkProductionVars(errors, warnings, isProduction);
  checkSessionDuration(warnings);
  checkBaseUrl(warnings);
  checkNoSensitiveKeysExposed(errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate and throw if environment is invalid
 * Call this at application startup
 */
interface EnsureEnvironmentOptions {
  fatal?: boolean;
}

export function ensureValidEnvironment(options: EnsureEnvironmentOptions = {}): void {
  const fatal = options.fatal ?? process.env.NODE_ENV === 'production';
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    logger.warn('Environment variable warnings', { warnings: result.warnings });
    result.warnings.forEach((warning) => {
      logger.warn(`Environment warning: ${warning}`);
    });
  }

  // Throw on errors in production
  if (!result.valid) {
    logger.error('Environment validation failed', undefined, { errors: result.errors });
    result.errors.forEach((error) => {
      logger.error(`Environment error: ${error}`);
    });

    if (fatal) {
      throw new Error(
        'Environment validation failed. Please fix the errors above before starting the application.'
      );
    }
  }
}