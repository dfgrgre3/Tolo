/**
 * Environment Variables Validation
 * Validates all required environment variables at startup
 */

import { logger } from './logger';

const REQUIRED_ENV_VARS = {
  // Production required
  production: [
    'JWT_SECRET',
    'DATABASE_URL',
  ],
  // Development optional (but should be set)
  development: [],
} as const;

const MIN_JWT_SECRET_LENGTH = 32;

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate JWT_SECRET format and security
 */
function validateJWTSecret(): { valid: boolean; error?: string } {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!jwtSecret) {
    return {
      valid: false,
      error: 'JWT_SECRET is not set in environment variables',
    };
  }

  // Check for default/unsafe values
  const unsafeValues = [
    'your-secret-key',
    'fallback-jwt-secret-for-dev-only',
    'secret',
    'password',
    'changeme',
  ];

  if (unsafeValues.includes(jwtSecret)) {
    return {
      valid: false,
      error: `JWT_SECRET is using an unsafe default value: "${jwtSecret}". Please set a secure random secret.`,
    };
  }

  // Check minimum length
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    return {
      valid: false,
      error: `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long. Current length: ${jwtSecret.length}`,
    };
  }

  return { valid: true };
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Validate JWT_SECRET
  const jwtValidation = validateJWTSecret();
  if (!jwtValidation.valid) {
    if (isProduction) {
      errors.push(jwtValidation.error!);
    } else {
      warnings.push(jwtValidation.error! + ' (Development mode - should be fixed before production)');
    }
  }

  // Check required variables for production
  if (isProduction) {
    for (const envVar of REQUIRED_ENV_VARS.production) {
      if (!process.env[envVar]) {
        errors.push(`Required environment variable ${envVar} is not set`);
      }
    }
  }

  // Check DATABASE_URL format if set
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      errors.push('DATABASE_URL is not a valid URL format');
    }
  } else if (isProduction) {
    errors.push('DATABASE_URL is required in production');
  }

  // Check SESSION_DURATION if set
  if (process.env.SESSION_DURATION) {
    const duration = parseInt(process.env.SESSION_DURATION, 10);
    if (isNaN(duration) || duration < 60) {
      warnings.push('SESSION_DURATION should be at least 60 seconds');
    }
  }

  // Check NEXT_PUBLIC_BASE_URL if set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL);
    } catch {
      warnings.push('NEXT_PUBLIC_BASE_URL is not a valid URL format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validated JWT_SECRET with safety checks
 * Security: Validates in ALL environments to prevent unsafe fallback values
 * 
 * CRITICAL SECURITY: This function NEVER uses fallback values or defaults.
 * If JWT_SECRET is not set or is unsafe, the application will fail to start.
 * This prevents accidental deployment with insecure secrets.
 * 
 * @throws Error if JWT_SECRET is missing, unsafe, or too short
 * @returns Validated JWT_SECRET string
 */
export function getJWTSecret(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Security: NO FALLBACK VALUES ALLOWED - check both possible env var names
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!jwtSecret) {
    const errorMessage = 'JWT_SECRET is not set in environment variables. Please set JWT_SECRET or NEXTAUTH_SECRET.';
    
    // In production, this is a critical security error
    if (isProduction) {
      logger.error('CRITICAL SECURITY ERROR: JWT_SECRET is missing in production!', undefined, {
        error: errorMessage,
        environment: 'production'
      });
    }
    
    throw new Error(errorMessage);
  }

  // Enforce strict validation in ALL environments (not just production)
  // This prevents unsafe fallback values from being used accidentally
  const validation = validateJWTSecret();
  if (!validation.valid) {
    const errorMessage = `JWT_SECRET validation failed: ${validation.error}`;
    
    // Log security warning
    logger.error('JWT_SECRET validation failed - unsafe secret detected!', undefined, {
      error: validation.error,
      environment: process.env.NODE_ENV,
      secretLength: jwtSecret.length,
      // Don't log the actual secret, but log if it matches known unsafe patterns
      isUnsafeValue: jwtSecret === 'fallback-jwt-secret-for-dev-only' || 
                     jwtSecret === 'your-secret-key' ||
                     jwtSecret === 'secret' ||
                     jwtSecret === 'password' ||
                     jwtSecret === 'changeme'
    });
    
    // In production, always throw (critical security issue)
    if (isProduction) {
      throw new Error(`CRITICAL SECURITY ERROR: ${errorMessage}`);
    }
    
    // In development, log warning but still throw to prevent accidental deployment
    // This ensures developers fix the issue before it reaches production
    logger.warn(`JWT_SECRET validation failed: ${validation.error}`);
    throw new Error(errorMessage);
  }

  // Additional security check: warn if secret seems weak (but still valid)
  if (jwtSecret.length < 64 && isProduction) {
    logger.warn('JWT_SECRET is shorter than recommended (64+ characters) for production use', undefined, {
      currentLength: jwtSecret.length,
      recommendedLength: 64
    });
  }

  return jwtSecret;
}

/**
 * Validate and throw if environment is invalid
 * Call this at application startup
 */
export function ensureValidEnvironment(): void {
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
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Environment validation failed. Please fix the errors above before starting the application.'
      );
    }
  }
}

