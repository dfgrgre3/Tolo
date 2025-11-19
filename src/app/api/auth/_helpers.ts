import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { LoginErrorResponse } from '@/types/api/auth';
import { logger } from '@/lib/logger';

// ==================== CONSTANTS ====================

export const RESET_TOKEN_EXPIRY_HOURS = 1;
export const RESET_TOKEN_EXPIRY_MS = RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
export const EMAIL_VERIFICATION_EXPIRY_MS = EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;
export const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour in seconds
export const REFRESH_TOKEN_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days in seconds
export const REFRESH_TOKEN_MAX_AGE_DEFAULT = 24 * 60 * 60; // 24 hours in seconds

// ==================== VALIDATION SCHEMAS ====================

export const emailSchema = z
  .string()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('البريد الإلكتروني غير صالح')
  .max(255, 'البريد الإلكتروني طويل جداً')
  .transform((email) => email.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً')
  .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
  .regex(/[^A-Za-z0-9]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');

export const nameSchema = z
  .string()
  .min(1, 'الاسم مطلوب')
  .max(100, 'الاسم طويل جداً')
  .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط')
  .optional();

export const resetTokenSchema = z.string().min(1, 'رمز إعادة التعيين مطلوب');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get secure cookie options
 * Security: Centralized cookie security settings for consistency across the application
 * 
 * Security Requirements:
 * - In production: secure MUST be true (HTTPS only)
 * - In production: sameSite SHOULD be 'strict' (best CSRF protection)
 * - httpOnly is always true (prevents XSS attacks)
 * 
 * Note: OAuth redirects may require 'lax' sameSite - use options parameter to override
 */
export function getSecureCookieOptions(options?: {
  maxAge?: number;
  sameSite?: 'strict' | 'lax' | 'none';
}): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge?: number;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Security: In production, secure MUST be true (no exceptions)
  // Only allow false in development if explicitly set via COOKIE_SECURE=false
  const isSecure = isProduction 
    ? true  // Always secure in production
    : (process.env.COOKIE_SECURE === 'true' || process.env.COOKIE_SECURE !== 'false');
  
  // Security: Use 'strict' in production for maximum CSRF protection
  // Allow 'lax' only if explicitly needed (e.g., OAuth redirects) via options parameter
  // Can be overridden via COOKIE_SAME_SITE env variable for special cases
  const defaultSameSite = isProduction 
    ? 'strict'  // Maximum security in production
    : 'lax';    // More permissive in development
  
  const sameSite = options?.sameSite || 
                   (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 
                   defaultSameSite;

  // Security warning in production if secure is false (should never happen)
  if (isProduction && !isSecure) {
    logger.error('SECURITY WARNING: Cookies are not secure in production! This is a critical security issue.');
  }

  return {
    httpOnly: true,  // Always true - prevents JavaScript access (XSS protection)
    secure: isSecure,  // HTTPS only in production
    sameSite: sameSite,  // CSRF protection
    path: '/',
    ...(options?.maxAge !== undefined && { maxAge: options.maxAge }),
  };
}

/**
 * Helper function to set authentication cookies
 * Security: Uses strict cookie settings for maximum security
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
): void {
  response.cookies.set('access_token', accessToken, {
    ...getSecureCookieOptions({ maxAge: ACCESS_TOKEN_MAX_AGE }),
  });

  response.cookies.set('refresh_token', refreshToken, {
    ...getSecureCookieOptions({ 
      maxAge: rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE_DEFAULT 
    }),
  });
}

/**
 * Helper function to clear authentication cookies
 * Security: Uses same secure settings as setAuthCookies for consistency
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('access_token', '', {
    ...getSecureCookieOptions({ maxAge: 0 }),
  });

  response.cookies.set('refresh_token', '', {
    ...getSecureCookieOptions({ maxAge: 0 }),
  });
}

/**
 * Helper function to check if error is a connection/database error
 * Improved to handle more error types and Prisma-specific errors
 */
export function isConnectionError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  // Check for Prisma error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string | number };
    const errorCode = String(prismaError.code).toUpperCase();
    // P1xxx codes are connection errors
    if (errorCode.startsWith('P1')) {
      return true;
    }
    // P2002 can be a connection issue (race condition)
    if (errorCode === 'P2002') {
      return true;
    }
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  const errorName = error instanceof Error ? error.name : '';
  const fullError = `${errorName} ${errorMessage} ${errorStack}`.toLowerCase();
  
  // Connection-related keywords
  const connectionKeywords = [
    'connect',
    'connection',
    'econnrefused',
    'etimedout',
    'econnreset',
    'enotfound',
    'networkerror',
    'network error',
    'failed to fetch',
    'fetch error',
    'connection timeout',
    'connection refused',
    'connection lost',
    'connection closed',
    'socket hang up',
    'econnaborted',
  ];
  
  // Database-related keywords
  const databaseKeywords = [
    'database',
    'prisma',
    'query timeout',
    'connection pool',
    'pool exhausted',
    'too many connections',
    'cannot read properties',
    'undefined',
  ];
  
  // Check if error message contains any connection keywords
  if (connectionKeywords.some(keyword => fullError.includes(keyword))) {
    return true;
  }
  
  // Check if error message contains database keywords (but not data validation errors)
  if (databaseKeywords.some(keyword => fullError.includes(keyword))) {
    // Exclude data validation errors (P2000-P2009 except P2002)
    const prismaDataErrorPattern = /p20[0-9][0-9]/;
    if (!prismaDataErrorPattern.test(fullError) || fullError.includes('p2002')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Helper function to get error code from error
 */
export function getErrorCode(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  const fullError = `${errorMessage} ${errorStack}`.toLowerCase();
  
  if (isConnectionError(error)) {
    return 'CONNECTION_ERROR';
  } else if (fullError.includes('unauthorized') || fullError.includes('invalid')) {
    return 'AUTH_ERROR';
  } else if (fullError.includes('rate limit') || fullError.includes('too many')) {
    return 'RATE_LIMIT_ERROR';
  } else if (fullError.includes('validation')) {
    return 'VALIDATION_ERROR';
  }
  
  // Use SERVER_ERROR for server-side errors to match client expectations
  return 'SERVER_ERROR';
}

/**
 * Helper function to create error response
 * Improved to handle empty errors and various error formats
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.'
): NextResponse {
  // Normalize error - handle empty objects and various error formats
  let errorMessage: string;
  let errorCode: string;
  
  if (!error) {
    // No error provided
    errorMessage = defaultMessage;
    errorCode = 'SERVER_ERROR';
  } else if (error instanceof Error) {
    // Native Error object
    errorMessage = error.message || defaultMessage;
    errorCode = getErrorCode(error);
  } else if (typeof error === 'string') {
    // String error
    errorMessage = error || defaultMessage;
    errorCode = 'SERVER_ERROR';
  } else if (typeof error === 'object') {
    // Object error - check if it's empty
    const errorObj = error as { error?: string; code?: string; message?: string; [key: string]: unknown };
    const keys = Object.keys(errorObj);
    
    if (keys.length === 0) {
      // Empty object
      errorMessage = defaultMessage;
      errorCode = 'SERVER_ERROR';
    } else if (errorObj.error) {
      // Already formatted error response - preserve the code if present
      errorMessage = errorObj.error;
      errorCode = errorObj.code || getErrorCode(error);
    } else {
      // Try to extract message from object
      errorMessage = errorObj.message || errorObj.toString() || defaultMessage;
      errorCode = errorObj.code || getErrorCode(error);
    }
  } else {
    // Unknown format
    errorMessage = String(error) || defaultMessage;
    errorCode = 'SERVER_ERROR';
  }
  
  const isConnection = isConnectionError(error);
  
  const userFriendlyMessage = isConnection
    ? 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.'
    : errorMessage;
  
  const response = NextResponse.json(
    {
      error: userFriendlyMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    },
    { status: isConnection ? 503 : 500 }
  );
  
  return addSecurityHeaders(response);
}

/**
 * Helper to create CAPTCHA required response
 */
export function createCaptchaRequiredResponse(
  failedAttempts: number,
  status: number = 401
): NextResponse<LoginErrorResponse> {
  return NextResponse.json(
    {
      error:
        'يرجى إكمال التحقق من CAPTCHA للمتابعة. تم اكتشاف محاولات تسجيل دخول متكررة.',
      requiresCaptcha: true,
      failedAttempts,
      code: 'CAPTCHA_REQUIRED',
    },
    { status }
  );
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Format lockout time for display
 */
export function formatLockoutTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Check if request is from a trusted source (optional security check)
 */
export function isTrustedRequest(request: Request): boolean {
  // In production, you might want to check origin headers
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '';
    
    // Allow requests from same origin or trusted domains
    if (origin && allowedOrigin) {
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowedOrigin);
        return originUrl.hostname === allowedUrl.hostname;
      } catch {
        // Invalid URL, fallback to string comparison
        return origin.includes(allowedOrigin);
      }
    }
    
    return !origin || origin.includes(allowedOrigin);
  }
  
  // In development, allow all requests
  return true;
}

/**
 * Rate limit key generator for better organization
 */
export function generateRateLimitKey(
  prefix: string,
  identifier: string
): string {
  return `rate_limit:${prefix}:${identifier}`;
}

/**
 * Validate and normalize email address
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return email.trim().toLowerCase();
}

/**
 * Check if password meets security requirements
 */
export function isStrongPassword(password: string): boolean {
  if (!password || password.length < 8 || password.length > 128) {
    return false;
  }
  
  // Check for at least one uppercase, lowercase, number, and special char
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

/**
 * Sanitize and validate user input string
 */
export function sanitizeString(
  input: string,
  maxLength: number = 1000
): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, maxLength); // Limit length
}

/**
 * Create a secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Extract IP and User Agent from request
 * Helper function to standardize request metadata extraction
 */
export function extractRequestMetadata(request: NextRequest): {
  ip: string;
  userAgent: string;
  clientId: string;
} {
  // Validate input
  if (!request || typeof request !== 'object') {
    return {
      ip: 'unknown',
      userAgent: 'unknown',
      clientId: 'unknown-unknown',
    };
  }

  // This will use authService if available, otherwise fallback
  try {
    const { authService } = require('@/lib/auth-service');
    const ip = authService.getClientIP(request) || 'unknown';
    const userAgent = authService.getUserAgent(request) || 'unknown';
    
    // Sanitize and limit length
    const sanitizedIP = typeof ip === 'string' ? ip.trim().slice(0, 100) : 'unknown';
    const sanitizedUserAgent = typeof userAgent === 'string' ? userAgent.trim().slice(0, 500) : 'unknown';
    
    return {
      ip: sanitizedIP,
      userAgent: sanitizedUserAgent,
      clientId: `${sanitizedIP}-${sanitizedUserAgent}`.slice(0, 600),
    };
  } catch (error) {
    // Fallback if authService is not available
    logger.warn('Error extracting request metadata with authService, using fallback:', error);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Sanitize and limit length
    const sanitizedIP = typeof ip === 'string' ? ip.trim().slice(0, 100) : 'unknown';
    const sanitizedUserAgent = typeof userAgent === 'string' ? userAgent.trim().slice(0, 500) : 'unknown';
    
    return {
      ip: sanitizedIP,
      userAgent: sanitizedUserAgent,
      clientId: `${sanitizedIP}-${sanitizedUserAgent}`.slice(0, 600),
    };
  }
}

/**
 * Validate and parse request body with size limits
 * Prevents DoS attacks by limiting body size
 */
export async function parseRequestBody<T = unknown>(
  request: NextRequest,
  options: {
    maxSize?: number; // in bytes, default 1024 (1KB)
    required?: boolean;
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  // Validate inputs
  if (!request || typeof request !== 'object') {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'طلب غير صحيح.',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      ),
    };
  }

  const { maxSize = 1024, required = false } = options;

  // Validate maxSize
  const validMaxSize = Math.max(1, Math.min(maxSize, 10 * 1024 * 1024)); // 1 byte to 10MB

  const contentLength = request.headers.get('content-length');
  
  if (required && (contentLength === '0' || !contentLength)) {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'الطلب فارغ. يرجى إدخال البيانات المطلوبة.',
          code: 'EMPTY_REQUEST_BODY',
        },
        { status: 400 }
      ),
    };
  }

  if (contentLength) {
    const contentLengthNum = parseInt(contentLength, 10);
    if (isNaN(contentLengthNum) || contentLengthNum < 0) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'حجم الطلب غير صحيح.',
            code: 'INVALID_CONTENT_LENGTH',
          },
          { status: 400 }
        ),
      };
    }
    if (contentLengthNum > validMaxSize) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'حجم الطلب كبير جداً.',
            code: 'REQUEST_TOO_LARGE',
            maxSize: validMaxSize,
          },
          { status: 413 }
        ),
      };
    }
  }

  try {
    // Add timeout protection for JSON parsing
    const jsonPromise = request.json() as Promise<T>;
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Request body parsing timeout'));
      }, 5000); // 5 second timeout
    });

    const data = await Promise.race([jsonPromise, timeoutPromise]);
    return { success: true, data };
  } catch (jsonError) {
    logger.error('Error parsing request body:', jsonError);
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
          code: 'INVALID_REQUEST_BODY',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Add security headers to a NextResponse
 * Security: Centralized security headers for consistent protection
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add CSP header in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
  }
  
  return response;
}

/**
 * Create success response with consistent format and security headers
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: { success?: boolean; message?: string; [key: string]: unknown } = {};
  
  if (message) {
    response.message = message;
  }
  
  // If data is already an object, merge it; otherwise set as 'data'
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    Object.assign(response, data);
    if (!('success' in response)) {
      response.success = true;
    }
  } else {
    response.data = data;
    response.success = true;
  }

  const nextResponse = NextResponse.json(response, { status });
  return addSecurityHeaders(nextResponse);
}

/**
 * Standard error response creator with security headers
 */
export function createStandardErrorResponse(
  error: unknown,
  defaultMessage: string = 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.',
  status: number = 500
): NextResponse {
  const errorResponse = createErrorResponse(error, defaultMessage);
  
  // Add security headers to error responses
  addSecurityHeaders(errorResponse);
  
  // Update status if provided
  if (status !== 500) {
    const body = JSON.parse(errorResponse.body?.toString() || '{}');
    const response = NextResponse.json(body, { status });
    return addSecurityHeaders(response);
  }
  
  return errorResponse;
}

/**
 * Database query wrapper with error handling and timeout protection
 * Handles connection errors gracefully
 */
export async function withDatabaseQuery<T>(
  query: () => Promise<T>,
  options: {
    onConnectionError?: () => NextResponse;
    onError?: (error: unknown) => NextResponse;
    timeout?: number; // Timeout in milliseconds, default 10 seconds
  } = {}
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  // Validate inputs
  if (!query || typeof query !== 'function') {
    const response = createErrorResponse(
      new Error('Invalid query function'),
      'دالة الاستعلام غير صحيحة.'
    );
    return { success: false, response };
  }

  const timeout = Math.max(1000, Math.min(options.timeout || 10000, 60000)); // 1s to 60s

  try {
    // Add timeout protection
    const queryPromise = query();
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Database query timeout after ${timeout}ms`));
      }, timeout);
    });

    const data = await Promise.race([queryPromise, timeoutPromise]);
    return { success: true, data };
  } catch (error) {
    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      logger.error('Database query timeout:', error);
      const response = NextResponse.json(
        {
          error: 'انتهت مهلة الاستعلام. يرجى المحاولة مرة أخرى.',
          code: 'QUERY_TIMEOUT',
        },
        { status: 504 }
      );
      return { success: false, response: addSecurityHeaders(response) };
    }

    if (isConnectionError(error)) {
      const response = options.onConnectionError?.() || NextResponse.json(
        {
          error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
          code: 'CONNECTION_ERROR',
        },
        { status: 503 }
      );
      return { success: false, response: addSecurityHeaders(response) };
    }

    if (options.onError) {
      const response = options.onError(error);
      return { success: false, response: addSecurityHeaders(response) };
    }

    // Default error handling
    const response = createErrorResponse(
      error,
      'حدث خطأ أثناء معالجة البيانات.'
    );
    return { success: false, response };
  }
}

/**
 * Safe security event logger with timeout protection
 * Wraps security event logging to prevent failures from breaking the flow
 */
export async function logSecurityEventSafely(
  userId: string | null,
  eventType: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
  } = {}
): Promise<void> {
  // Validate inputs
  if (eventType && typeof eventType !== 'string') {
    logger.warn('Invalid eventType provided to logSecurityEventSafely');
    return;
  }

  if (userId !== null && (typeof userId !== 'string' || userId.trim().length === 0)) {
    logger.warn('Invalid userId provided to logSecurityEventSafely');
    return;
  }

  // Sanitize metadata
  const sanitizedMetadata: { ip?: string; userAgent?: string; [key: string]: unknown } = {};
  if (metadata.ip && typeof metadata.ip === 'string') {
    sanitizedMetadata.ip = metadata.ip.trim().slice(0, 100);
  }
  if (metadata.userAgent && typeof metadata.userAgent === 'string') {
    sanitizedMetadata.userAgent = metadata.userAgent.trim().slice(0, 500);
  }

  // Limit metadata size to prevent DoS
  const metadataKeys = Object.keys(metadata).slice(0, 50);
  for (const key of metadataKeys) {
    if (key !== 'ip' && key !== 'userAgent') {
      const value = metadata[key];
      if (typeof value === 'string') {
        sanitizedMetadata[key] = value.slice(0, 1000);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedMetadata[key] = value;
      }
    }
  }

  try {
    const { authService } = require('@/lib/auth-service');
    
    // Add timeout protection
    const logPromise = authService.logSecurityEvent(
      userId,
      eventType,
      sanitizedMetadata.ip || 'unknown',
      {
        userAgent: sanitizedMetadata.userAgent || 'unknown',
        ...sanitizedMetadata,
      }
    );
    
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        logger.warn('Security event logging timeout');
        resolve();
      }, 3000); // 3 second timeout
    });

    await Promise.race([logPromise, timeoutPromise]);
  } catch (error) {
    // Don't fail the request if logging fails, but log the error
    logger.error('Failed to log security event:', error);
  }
}

