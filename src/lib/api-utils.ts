import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { redis } from '@/lib/redis';

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
   * Check if a client has exceeded rate limits using Redis
   * @param clientId Unique identifier for the client (e.g., IP + User Agent)
   * @param config Rate limiting configuration
   * @returns Rate limit check result
   */
  async checkRateLimit(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<RateLimitResult> {
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Check if account is locked
      const lockedUntil = await redis.get(lockoutKey);
      if (lockedUntil) {
        const lockoutTime = parseInt(lockedUntil, 10);
        if (now < lockoutTime) {
          const remainingTime = Math.ceil((lockoutTime - now) / 60000); // in minutes
          return {
            allowed: false,
            attempts: config.maxAttempts,
            remainingTime,
            lockedUntil: lockoutTime
          };
        } else {
          // Lockout expired, remove the lockout key
          await redis.del(lockoutKey);
        }
      }

      // Use Redis pipeline for atomic operations
      const pipeline = redis.multi();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Get current count
      pipeline.zcard(key);

      const results = await pipeline.exec();
      const currentCount = results[1] as number;

      return {
        allowed: currentCount < config.maxAttempts,
        attempts: currentCount,
        remainingTime: undefined
      };
    } catch (error) {
      console.error('Rate limiting check error:', error);
      // Fail open - don't block requests if rate limiting fails
      return {
        allowed: true,
        attempts: 0
      };
    }
  }

  /**
   * Increment failed attempts for a client using Redis
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   */
  async incrementAttempts(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<void> {
    const key = `rate_limit:${clientId}`;
    const lockoutKey = `lockout:${clientId}`;

    const now = Date.now();

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.multi();

      // Add current attempt
      pipeline.zadd(key, { [now]: now.toString() });

      // Set expiration for the sorted set
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      await pipeline.exec();

      // Check if we need to lock the account
      const result = await this.checkRateLimit(clientId, config);
      if (result.attempts >= config.maxAttempts && config.lockoutMs) {
        // Lock the account
        const lockoutUntil = now + config.lockoutMs;
        await redis.setEx(lockoutKey, Math.ceil(config.lockoutMs / 1000), lockoutUntil.toString());
      }
    } catch (error) {
      console.error('Failed to record failed attempt:', error);
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
      console.error('Failed to reset rate limit:', error);
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
  details?: Record<string, any>;
  code?: string;
  status: number;
}

// Standardized success response format
export interface APISuccess<T = any> {
  data: T;
  message?: string;
  status: number;
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Unified error handler function that creates standardized responses
export function handleApiError(error: unknown): NextResponse<APIError> {
  console.error('API Error:', error);

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
  if (error instanceof SyntaxError && (error as any).message.includes('JSON')) {
    return NextResponse.json(
      {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        status: 400
      },
      { status: 400 }
    );
  }

  if ((error as any).name === 'ZodError') {
    return NextResponse.json(
      {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: (error as any).errors,
        status: 400
      },
      { status: 400 }
    );
  }

  if ((error as any).code === 'P2002') {
    return NextResponse.json(
      {
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        status: 409
      },
      { status: 409 }
    );
  }

  if ((error as any).code === 'P2025') {
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
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessages = result.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');

      return { success: false, error: errorMessages };
    }

    return { success: true, data: result.data };
  } catch (error) {
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
  params: Record<string, any>,
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

/**
 * Helper function to check if a request is from an authenticated user
 * @param request Next.js request object
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<any | null> {
  try {
    // This would depend on your authentication implementation
    // For example, you might extract a token from the Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify token and extract user information
    // This is just a placeholder - implement based on your auth system
    // const user = await verifyToken(token);

    // For now, return null
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

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
