/**
* Environment Variables Validation
* Validates all required environment variables at startup
*/

import { logger } from './logger';

const REQUIRED_ENV_VARS = {
  // Production required
  production: [],

  // Development optional (but should be set)
  development: []
} as const;

const MIN_JWT_SECRET_LENGTH = 32;

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function checkProductionVars(errors: string[], isProduction: boolean) {
  if (isProduction) {
    for (const envVar of REQUIRED_ENV_VARS.production) {
      if (!process.env[envVar]) {
        errors.push(`Required environment variable ${envVar} is not set`);
      }
    }
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

function checkNoSensitiveKeysExposed(errors: string[]) {
  const allowedKeys = new Set([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_CLERK_DOMAIN',
    'NEXT_PUBLIC_CLERK_IS_SATELLITE',
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_ADMIN_URL',
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_RP_ID',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_ENABLE_LOGIN_COMPLEXITY',
    'NEXT_PUBLIC_CLERK_PROXY_URL',
  ]);

  const sensitivePatterns = [
    'key', 'token', 'secret', 'password', 'pass', 'database', 'url', 'cred', 'private'
  ];

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      if (allowedKeys.has(key)) {
        continue;
      }
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitivePatterns.some(pattern => lowerKey.includes(pattern));
      if (isSensitive) {
        errors.push(`Security Violation: Sensitive variable ${key} must not be exposed to the client bundle via NEXT_PUBLIC_ prefix.`);
      }
    }
  }
}

/**
 * Validate all environment variables
 */
function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  checkProductionVars(errors, isProduction);
  checkSessionDuration(warnings);
  checkBaseUrl(warnings);
  checkNoSensitiveKeysExposed(errors);

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
