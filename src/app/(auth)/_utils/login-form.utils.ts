/**
 * Utility functions for the Enhanced Login Form
 */

import { LoginFormData, FieldErrors } from '../_types/login-form.types';
import { LAST_VISITED_PATH_KEY } from '@/providers/ClientLayoutProvider';
import { safeGetItem, safeRemoveItem, safeWindow } from '@/lib/safe-client-utils';
import { logger } from '@/lib/logger';

/**
 * Validate form data before submission
 * 
 * Security improvements:
 * - Comprehensive email validation with RFC 5321 compliance
 * - Enhanced password validation
 * - Protection against malicious input patterns
 */
import { z } from 'zod';

/**
 * Zod schema for login form validation
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('البريد الإلكتروني غير صالح. يرجى التحقق من التنسيق')
    .max(254, 'البريد الإلكتروني طويل جداً (الحد الأقصى 254 حرف)')
    .refine((email) => !email.includes('..') && !email.startsWith('.') && !email.endsWith('.'), {
      message: 'صيغة البريد الإلكتروني غير صحيحة',
    }),
  password: z
    .string()
    .min(1, 'كلمة المرور مطلوبة')
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)'),
});

/**
 * Validate form data before submission using Zod
 * 
 * Security improvements:
 * - Comprehensive email validation with RFC 5321 compliance
 * - Enhanced password validation
 * - Protection against malicious input patterns
 */
export const validateForm = (
  formData: LoginFormData
): { isValid: boolean; errors: FieldErrors } => {
  const result = loginSchema.safeParse(formData);

  if (!result.success) {
    const errors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path[0] as keyof FieldErrors;
      if (path) {
        errors[path] = issue.message;
      }
    });
    return { isValid: false, errors };
  }

  return { isValid: true, errors: {} };
};

/**
 * Validate two-factor code
 */
export const validateTwoFactorCode = (code: string): boolean => {
  return code.length === 6 && /^\d{6}$/.test(code);
};

/**
 * Format lockout time in MM:SS format
 */
export const formatLockoutTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Validate and sanitize redirect paths
 */
export const isValidRedirectPath = (path: string): boolean => {
  if (!path || typeof path !== 'string') return false;

  // Must be a relative path (starts with /)
  if (!path.startsWith('/')) return false;

  // Must not be an external URL (no //)
  if (path.startsWith('//')) return false;

  // Must not be auth pages (to prevent redirect loops)
  if (
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/auth/')
  ) {
    return false;
  }

  // Must not contain dangerous characters or patterns
  if (
    path.includes('<') ||
    path.includes('>') ||
    path.includes('javascript:') ||
    path.includes('data:')
  ) {
    return false;
  }

  return true;
};

/**
 * Get redirect path from URL or storage
 * Priority: 1. URL redirect parameter, 2. Stored path, 3. Home page
 */
export const getRedirectPath = (): string => {
  // 1. Check URL redirect parameter (highest priority)
  const redirectFromUrl = safeWindow((w) => {
    const urlParams = new URLSearchParams(w.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam) {
      try {
        const decoded = decodeURIComponent(redirectParam);
        // Extract path only (remove query params for validation, then add them back)
        const [pathOnly, queryParams] = decoded.split('?');
        if (isValidRedirectPath(pathOnly)) {
          return queryParams ? `${pathOnly}?${queryParams}` : pathOnly;
        }
      } catch (e) {
        logger.error('Failed to decode redirect parameter:', e);
      }
    }
    return null;
  }, null);

  if (redirectFromUrl) return redirectFromUrl;

  // 2. Check stored redirect path (from AuthGuard or previous navigation)
  try {
    const storedRedirect =
      safeGetItem(LAST_VISITED_PATH_KEY, {
        storageType: 'session',
        fallback: null,
      }) ??
      safeGetItem(LAST_VISITED_PATH_KEY, {
        storageType: 'local',
        fallback: null,
      });

    if (storedRedirect && isValidRedirectPath(storedRedirect)) {
      return storedRedirect;
    }
  } catch (storageError) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Unable to read stored redirect path:', storageError);
    }
  }

  // 3. Default to home page
  return '/';
};

/**
 * Clear stored redirect path from storage
 */
export const clearStoredRedirect = (): void => {
  safeRemoveItem(LAST_VISITED_PATH_KEY, { storageType: 'session' });
  safeRemoveItem(LAST_VISITED_PATH_KEY, { storageType: 'local' });
};

