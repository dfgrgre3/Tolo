import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { redis } from '@/lib/redis';

import { logger } from '@/lib/logger';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxAttempts: number;     // Maximum attempts allowed in the window
  lockoutMs?: number;      // Lockout duration in milliseconds (optional)
}

// Rate limit check result
interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  remainingTime?: number;
  lockedUntil?: number;
}

/**
 * Rate limiter class using Redis for persistent storage
 */
export class RateLimiter {
  private defaultConfig: RateLimitConfig;

  constructor(config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    lockoutMs: 30 * 60 * 1000 // 30 minutes
  }) {
    this.defaultConfig = config;
  }

  /**
   * Check if a client has exceeded rate limits using Redis with timeout protection
   * @param clientId Unique identifier for the client (e.g., IP + User Agent)
   * @param config Rate limiting configuration
   * @returns Rate limit check result
   */
  async checkRateLimit(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<RateLimitResult> {
    // Validate inputs
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      logger.warn('Invalid clientId provided to checkRateLimit');
      return {
        allowed: true,
        attempts: 0
      };
    }

    const trimmedClientId = clientId.trim();
    const key = `rate_limit:${trimmedClientId}`;
    const lockoutKey = `lockout:${trimmedClientId}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Check if account is locked with timeout protection
      const getLockPromise = redis.get(lockoutKey);
      const lockTimeoutPromise = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), 1000); // 1 second timeout
      });

      const lockedUntil = await Promise.race([getLockPromise, lockTimeoutPromise]);

      if (lockedUntil) {
        const lockoutTime = parseInt(lockedUntil, 10);
        if (!isNaN(lockoutTime) && now < lockoutTime) {
          const remainingTime = Math.ceil((lockoutTime - now) / 60000); // in minutes
          return {
            allowed: false,
            attempts: config.maxAttempts,
            remainingTime,
            lockedUntil: lockoutTime
          };
        } else {
          // Lockout expired, remove the lockout key (non-blocking)
          redis.del(lockoutKey).catch((error: unknown) => {
            logger.warn('Failed to remove expired lockout key:', error);
          });
        }
      }

      // Use Redis pipeline for atomic operations with timeout protection
      const pipeline = redis.multi();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Get current count
      pipeline.zcard(key);

      const execPromise = pipeline.exec();
      const execTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Redis pipeline timeout')), 2000); // 2 second timeout
      });

      const results = await Promise.race([execPromise, execTimeoutPromise]);
      const currentCount = (results && results[1] && results[1][1]) ? (results[1][1] as number) : 0;

      return {
        allowed: currentCount < config.maxAttempts,
        attempts: currentCount,
        remainingTime: undefined
      };
    } catch (error) {
      logger.error('Rate limiting check error:', error);
      // Fail open - don't block requests if rate limiting fails
      return {
        allowed: true,
        attempts: 0
      };
    }
  }

  /**
   * Increment failed attempts for a client using Redis with timeout protection
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   */
  async incrementAttempts(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<void> {
    // Validate inputs
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      logger.warn('Invalid clientId provided to incrementAttempts');
      return;
    }

    const trimmedClientId = clientId.trim();
    const key = `rate_limit:${trimmedClientId}`;
    const lockoutKey = `lockout:${trimmedClientId}`;

    const now = Date.now();

    try {
      // Use Redis pipeline for atomic operations with timeout protection
      const pipeline = redis.multi();

      // Add current attempt
      pipeline.zadd(key, now, now.toString());

      // Set expiration for the sorted set
      const expirationSeconds = Math.ceil(config.windowMs / 1000);
      pipeline.expire(key, expirationSeconds);

      const execPromise = pipeline.exec();
      const execTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Redis pipeline timeout')), 2000); // 2 second timeout
      });

      await Promise.race([execPromise, execTimeoutPromise]);

      // Check if we need to lock the account (non-blocking)
      this.checkRateLimit(trimmedClientId, config)
        .then((result) => {
          if (result.attempts >= config.maxAttempts && config.lockoutMs) {
            // Lock the account
            const lockoutUntil = now + config.lockoutMs;
            const lockoutSeconds = Math.ceil(config.lockoutMs / 1000);
            redis.setex(lockoutKey, lockoutSeconds, lockoutUntil.toString()).catch((error: unknown) => {
              logger.warn('Failed to set lockout:', error);
            });
          }
        })
        .catch((error) => {
          logger.warn('Failed to check rate limit after increment:', error);
        });
    } catch (error) {
      logger.error('Failed to record failed attempt:', error);
    }
  }

  /**
   * Reset rate limiting for a client after successful authentication using Redis
   * @param clientId Unique identifier for the client
   */
  async resetAttempts(clientId: string): Promise<void> {
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;

    try {
      await redis.del(key, lockoutKey);
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
    }
  }
}

/**
 * Extract client information from request for rate limiting and security
 * @param request Next.js request object
 * @returns Client information object
 */
export function extractClientInfo(request: NextRequest): {
  ip: string;
  userAgent: string;
  clientId: string;
} {
  // Extract IP address
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  // Extract User Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create unique client identifier
  const clientId = `${ip}:${userAgent}`;

  return {
    ip,
    userAgent,
    clientId
  };
}

// Standardized error response format
export interface APIError {
  error: string;
  details?: Record<string, unknown>;
  code?: string;
  status: number;
}

// Standardized success response format
export interface APISuccess<T = unknown> {
  data: T;
  message?: string;
  status: number;
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Unified error handler function that creates standardized responses
export function handleApiError(error: unknown): NextResponse<APIError> {
  logger.error('API Error:', error);

  // If it's our custom ApiError
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        status: error.status
      },
      { status: error.status }
    );
  }

  // Handle known error types
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        status: 400
      },
      { status: 400 }
    );
  }

  if ((error as { name: string }).name === 'ZodError') {
    const apiError: APIError = {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: ((error as { errors: unknown[] }).errors || []) as unknown as Record<string, unknown>,
      status: 400
    };
    return NextResponse.json(apiError, { status: 400 });
  }

  if ((error as { code: string }).code === 'P2002') {
    return NextResponse.json(
      {
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        status: 409
      },
      { status: 409 }
    );
  }

  if ((error as { code: string }).code === 'P2025') {
    return NextResponse.json(
      {
        error: 'Resource not found',
        code: 'NOT_FOUND',
        status: 404
      },
      { status: 404 }
    );
  }

  // For all other errors, return generic internal server error
  // Never expose internal error details to client
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    },
    { status: 500 }
  );
}

// Standardized success response helper
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<APISuccess<T>> {
  return NextResponse.json(
    {
      data,
      message,
      status
    },
    { status }
  );
}

// Authentication error helper
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<APIError> {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
      status: 401
    },
    { status: 401 }
  );
}

// Bad request error helper
export function badRequestResponse(message = 'Bad Request', code = 'BAD_REQUEST'): NextResponse<APIError> {
  return NextResponse.json(
    {
      error: message,
      code,
      status: 400
    },
    { status: 400 }
  );
}

// Not found error helper
export function notFoundResponse(message = 'Resource not found'): NextResponse<APIError> {
  return NextResponse.json(
    {
      error: message,
      code: 'NOT_FOUND',
      status: 404
    },
    { status: 404 }
  );
}

// Helper function to validate request body against a Zod schema
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    // Parse request body with timeout protection
    const bodyPromise = request.json();
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Request body parsing timeout')), 5000); // 5 second timeout
    });

    const body = await Promise.race([bodyPromise, timeoutPromise]);

    // Validate schema
    if (!schema || typeof schema.safeParse !== 'function') {
      return { success: false, error: 'Invalid validation schema' };
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessages = result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');

      return { success: false, error: errorMessages };
    }

    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('timeout')) {
      return { success: false, error: 'Request body parsing timeout' };
    }
    return { success: false, error: 'Invalid JSON in request body' };
  }
}

/**
 * Enhanced rate limiting function with sliding window algorithm using Redis
 * @param req Next.js request object
 * @param limit Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns NextResponse if rate limit exceeded, null otherwise
 */
export async function applyRateLimit(
  req: NextRequest,
  limit: number,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<NextResponse | null> {
  const clientInfo = extractClientInfo(req);
  const rateLimiter = new RateLimiter({
    windowMs,
    maxAttempts: limit
  });

  const result = await rateLimiter.checkRateLimit(clientInfo.clientId);

  if (!result.allowed) {
    const retryAfter = result.remainingTime || Math.ceil(windowMs / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
        }
      }
    );
  }

  return null;
}

/**
 * Helper function to validate required parameters
 * @param params Object containing parameters to validate
 * @param required Array of required parameter names
 * @returns NextResponse if validation fails, null otherwise
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  required: string[]
): NextResponse | null {
  for (const param of required) {
    if (params[param] === undefined || params[param] === null) {
      return NextResponse.json(
        {
          error: `Missing required parameter: ${param}`,
          code: 'MISSING_PARAMETER'
        },
        { status: 400 }
      );
    }
  }
  return null;
}

/**
 * Helper function to create paginated responses
 * @param data Array of data items
 * @param total Total count of items
 * @param limit Number of items per page
 * @param offset Current offset
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
) {
  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + data.length < total
    }
  };
}

/**
 * Helper function to validate UUID format
 * @param id String to validate
 * @returns boolean indicating if string is valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper function to sanitize user input
 * @param input String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

// getAuthenticatedUser removed


/**
 * Helper function to add security headers to responses
 * @param response Next.js response object
 * @returns Response with security headers added
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Create error response (backward compatibility alias)
 * @param message Error message
 * @param status HTTP status code
 * @param details Optional details object
 * @param code Optional error code
 * @returns NextResponse with error
 */
export function createErrorResponse(message: string, status: number = 500, details?: unknown, code?: string): NextResponse {
  if (code) {
    return NextResponse.json(
      {
        error: message,
        code,
        details,
        status
      },
      { status }
    );
  }
  return badRequestResponse(message, 'ERROR');
}

/**
 * Create success response (backward compatibility alias)
 * @param data Response data
 * @param message Optional success message
 * @param status HTTP status code
 * @returns NextResponse with success data
 */
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200): NextResponse {
  return successResponse(data, message, status);
}

/**
 * Rate limiting function with identifier support (backward compatibility wrapper)
 * @param req Next.js request object
 * @param limit Maximum requests allowed
 * @param identifier Optional identifier for rate limiting (not used in current implementation, but kept for compatibility)
 * @param windowMs Optional time window in milliseconds (default: 15 minutes)
 * @returns NextResponse if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  req: NextRequest,
  limit: number,
  identifier?: string,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): Promise<NextResponse | null> {
  return applyRateLimit(req, limit, windowMs);
}