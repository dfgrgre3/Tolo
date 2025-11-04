import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { LoginErrorResponse } from '@/types/api/auth';

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
 * Helper function to set authentication cookies
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
): void {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE_DEFAULT,
    path: '/',
  });
}

/**
 * Helper function to clear authentication cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Helper function to check if error is a connection/database error
 */
export function isConnectionError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  const fullError = `${errorMessage} ${errorStack}`.toLowerCase();
  
  return (
    fullError.includes('connect') ||
    fullError.includes('econnrefused') ||
    fullError.includes('etimedout') ||
    fullError.includes('database') ||
    fullError.includes('prisma') ||
    fullError.includes('timeout') ||
    fullError.includes('p1001') || // Prisma connection error
    fullError.includes('p1017') || // Prisma server closed connection
    fullError.includes('p2002') || // Prisma unique constraint
    fullError.includes('enotfound') ||
    fullError.includes('econnreset') ||
    fullError.includes('networkerror') ||
    fullError.includes('failed to fetch') ||
    fullError.includes('fetch error') ||
    fullError.includes('cannot read properties') ||
    fullError.includes('undefined')
  );
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
    const errorObj = error as any;
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
  
  return NextResponse.json(
    {
      error: userFriendlyMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    },
    { status: isConnection ? 503 : 500 }
  );
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

