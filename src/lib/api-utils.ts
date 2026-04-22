import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';


import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/lib/error-codes';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts allowed in the window
  lockoutMs?: number; // Lockout duration in milliseconds (optional)
  failClosed?: boolean; // Whether to block requests if Redis is unavailable
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
    const { rateLimitingService } = await import('@/services/rate-limiting-service');
    return rateLimitingService.checkRateLimit(clientId, config);
  }

  /**
   * Increment failed attempts for a client using Redis with timeout protection
   * @param clientId Unique identifier for the client
   * @param config Rate limiting configuration
   */
  async incrementAttempts(clientId: string, config: RateLimitConfig = this.defaultConfig): Promise<void> {
    const { rateLimitingService } = await import('@/services/rate-limiting-service');
    return rateLimitingService.recordFailedAttempt(clientId, config);
  }

  /**
   * Reset rate limiting for a client after successful authentication using Redis
   * @param clientId Unique identifier for the client
   */
  async resetAttempts(clientId: string): Promise<void> {
    const { rateLimitingService } = await import('@/services/rate-limiting-service');
    return rateLimitingService.resetAttempts(clientId);
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
  location: string;
} {
  // Extract IP address
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  request.headers.get('cf-connecting-ip') ||
  'unknown';

  // Extract User Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Extract Location (e.g. from Vercel or Cloudflare headers, or mock)
  const location =
  request.headers.get('x-vercel-ip-city') ?
  `${request.headers.get('x-vercel-ip-city')}, ${request.headers.get('x-vercel-ip-country')}` :
  request.headers.get('cf-ipcountry') || 'Unknown';

  // Create unique client identifier
  const clientId = `${ip}:${userAgent}`;

  return {
    ip,
    userAgent,
    clientId,
    location
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
  public readonly details?: Record<string, unknown>)
  {
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
        code: ERROR_CODES.INVALID_JSON,
        status: 400
      },
      { status: 400 }
    );
  }

  if ((error as {name: string;}).name === 'ZodError') {
    const apiError: APIError = {
      error: 'Validation error',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: ((error as {errors: unknown[];}).errors || []) as unknown as Record<string, unknown>,
      status: 400
    };
    return NextResponse.json(apiError, { status: 400 });
  }

  if ((error as {code: string;}).code === 'P2002') {
    return NextResponse.json(
      {
        error: 'Resource already exists',
        code: ERROR_CODES.DUPLICATE_RESOURCE,
        status: 409
      },
      { status: 409 }
    );
  }

  if ((error as {code: string;}).code === 'P2025') {
    return NextResponse.json(
      {
        error: 'Resource not found',
        code: ERROR_CODES.NOT_FOUND,
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
      code: ERROR_CODES.INTERNAL_ERROR,
      status: 500
    },
    { status: 500 }
  );
}

// Standardized success response helper with payload shredding for 10M+ users
export function successResponse<T>(
data: T,
message?: string,
status: number = 200,
fields?: string[] // Optional: list of fields to include (shredding)
): NextResponse<APISuccess<T>> {
  let finalData = data;

  // Payload Shredding: Only include requested fields to save bandwidth
  if (fields && fields.length > 0 && typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      finalData = data.map((item) => {
        const shredded: any = {};
        fields.forEach((f) => {if (item[f] !== undefined) shredded[f] = item[f];});
        return shredded;
      }) as any;
    } else {
      const shredded: any = {};
      fields.forEach((f) => {if ((data as any)[f] !== undefined) shredded[f] = (data as any)[f];});
      finalData = shredded as T;
    }
  }

  return NextResponse.json(
    {
      data: finalData,
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
      code: ERROR_CODES.UNAUTHORIZED,
      status: 401
    },
    { status: 401 }
  );
}

// Bad request error helper
export function badRequestResponse(message = 'Bad Request', code: string = ERROR_CODES.BAD_REQUEST): NextResponse<APIError> {
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
      code: ERROR_CODES.NOT_FOUND,
      status: 404
    },
    { status: 404 }
  );
}

// Forbidden error helper
export function forbiddenResponse(message = 'Forbidden'): NextResponse<APIError> {
  return NextResponse.json(
    {
      error: message,
      code: ERROR_CODES.FORBIDDEN || 'FORBIDDEN',
      status: 403
    },
    { status: 403 }
  );
}


// Helper function to validate request body against a Zod schema
export async function validateRequestBody<T>(
request: NextRequest,
schema: ZodSchema<T>)
: Promise<{success: true;data: T;} | {success: false;error: string;}> {
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
      const errorMessages = result.error.issues.
      map((issue) => `${issue.path.join('.')}: ${issue.message}`).
      join(', ');

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
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
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
required: string[])
: NextResponse | null {
  for (const param of required) {
    if (params[param] === undefined || params[param] === null) {
      return NextResponse.json(
        {
          error: `Missing required parameter: ${param}`,
          code: ERROR_CODES.MISSING_PARAMETER
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
offset: number)
{
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
  return input.
  replace(/[<>]/g, '') // Remove potential HTML tags
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

// Export Ops Middleware utilities for easier access
export { opsMiddleware, opsWrapper } from './middleware/ops-middleware';


/**
 * Create error response (backward compatibility alias)
 * @param message Error message
 * @param status HTTP status code
 * @param details Optional details object
 * @param code Optional error code
 * @returns NextResponse with error
 */
export function createErrorResponse(message: string, status: number = 500, details?: unknown, code?: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: code || ERROR_CODES.INTERNAL_ERROR,
      details,
      status
    },
    { status }
  );
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

export function createStandardErrorResponse(error: any, defaultMessage: string, status: number = 500): NextResponse {
  const message = error instanceof Error ? error.message : defaultMessage;
  return createErrorResponse(message, status, undefined, status === 400 ? ERROR_CODES.BAD_REQUEST : ERROR_CODES.INTERNAL_ERROR);
}

export async function parseRequestBody<T>(req: NextRequest, options?: {maxSize?: number;required?: boolean;}) {
  try {
    const text = await req.text();
    if (!text && options?.required) {
      return { success: false as const, error: badRequestResponse('Missing body', ERROR_CODES.MISSING_PARAMETER) };
    }
    if (!text) {
      return { success: true as const, data: {} as T };
    }
    if (options?.maxSize && text.length > options.maxSize) {
      return { success: false as const, error: createErrorResponse('Payload too large', 413, undefined, ERROR_CODES.BAD_REQUEST) };
    }
    const data = JSON.parse(text) as T;
    return { success: true as const, data };
  } catch (_e) {
    return { success: false as const, error: badRequestResponse('Invalid JSON', ERROR_CODES.INVALID_JSON) };
  }
}

export interface AuthContextUser {
  userId: string;
  userRole: string;
  role: string;
  permissions: string[];
  sessionId?: string;
}





/**
 * Standardized authentication wrapper for API routes.
 * Extracts user ID and Role from headers (injected by Next.js middleware)
 * and automatically returns unauthorized response if missing.
 */
export async function withAuth(
req: NextRequest,
handler: (user: AuthContextUser) => Promise<NextResponse> | NextResponse)
: Promise<NextResponse> {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role") || "USER";
  const permissionsHeader = req.headers.get("x-user-permissions") || "";
  const permissions = permissionsHeader ? permissionsHeader.split(",") : [];
  const sessionId = req.headers.get("x-session-id") || undefined;

  if (userId) {
    return handler({
      userId,
      userRole,
      role: userRole,
      permissions,
      sessionId
    });
  }

  // Fallback if middleware didn't run (e.g. Edge cases or direct route calls)
  return unauthorizedResponse("Missing authentication context. Standard middleware check failed.");
}
/**
 * Authentication and Authorization wrapper for ADMIN only routes.
 */
export async function withAdmin(
req: NextRequest,
handler: (user: AuthContextUser) => Promise<NextResponse> | NextResponse)
: Promise<NextResponse> {
  return withAuth(req, async (user) => {
    if (user.role !== 'ADMIN') {
      return forbiddenResponse("غير مسموح لك بالوصول إلى هذه الصفحة. يتطلب صلاحيات مدير");
    }
    return handler(user);
  });
}

/**
 * Authentication and Authorization wrapper for TEACHER and ADMIN routes.
 */
export async function withTeacher(
req: NextRequest,
handler: (user: AuthContextUser) => Promise<NextResponse> | NextResponse)
: Promise<NextResponse> {
  return withAuth(req, async (user) => {
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return forbiddenResponse("غير مسموح لك بالوصول إلى هذه الصفحة. يتطلب صلاحيات معلم");
    }
    return handler(user);
  });
}

/**
 * Authentication and Authorization wrapper for STUDENT only routes.
 */
export async function withStudent(
req: NextRequest,
handler: (user: AuthContextUser) => Promise<NextResponse> | NextResponse)
: Promise<NextResponse> {
  return withAuth(req, async (user) => {
    if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      return forbiddenResponse("غير مسموح لك بالوصول إلى هذه الصفحة. يتطلب حساب طالب");
    }
    return handler(user);
  });
}