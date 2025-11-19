/**
 * Utility functions for the Enhanced Login Form
 */

import { LoginFormData, FieldErrors } from '../types/login-form.types';
import { LAST_VISITED_PATH_KEY } from '@/app/ClientLayoutProvider';
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
export const validateForm = (
  formData: LoginFormData
): { isValid: boolean; errors: FieldErrors } => {
  const errors: FieldErrors = {};

  // Email validation with comprehensive checks
  const trimmedEmail = formData.email.trim();
  if (!trimmedEmail) {
    errors.email = 'البريد الإلكتروني مطلوب';
  } else {
    // Validate email length (RFC 5321 limit)
    if (trimmedEmail.length > 254) {
      errors.email = 'البريد الإلكتروني طويل جداً (الحد الأقصى 254 حرف)';
    } else {
      // Normalize email to lowercase for validation
      const normalizedEmail = trimmedEmail.toLowerCase();
      
      // Enhanced email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        errors.email = 'البريد الإلكتروني غير صالح. يرجى التحقق من التنسيق';
      } else {
        // Additional security: Check for potentially malicious email patterns
        if (normalizedEmail.includes('..') || normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
          errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
        }
      }
    }
  }

  // Password validation with security best practices
  if (!formData.password) {
    errors.password = 'كلمة المرور مطلوبة';
  } else if (typeof formData.password !== 'string') {
    errors.password = 'كلمة المرور يجب أن تكون نص';
  } else if (formData.password.length < 8) {
    errors.password = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
  } else if (formData.password.length > 128) {
    errors.password = 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
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

