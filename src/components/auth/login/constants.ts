/**
 * Login flow constants
 * Centralized constants for login flow steps and labels
 */

import type { LoginStep } from './types';

/** All possible login steps in order */
export const LOGIN_STEPS: LoginStep[] = ['credentials', 'two-factor', 'success'];

/** Localized labels for each login step */
export const LOGIN_STEP_LABELS: Record<LoginStep, string> = {
  'credentials': 'إدخال بيانات الدخول',
  'two-factor': 'المصادقة الثنائية',
  'success': 'تم تسجيل الدخول',
};

/** Localized labels for two-factor authentication methods */
export const TWO_FACTOR_METHOD_LABELS: Record<string, string> = {
  email: 'البريد الإلكتروني',
  sms: 'رسالة نصية',
};

/** Default timeout for two-factor code expiration (in seconds) */
export const TWO_FACTOR_CODE_TIMEOUT = 300; // 5 minutes

/** Cooldown period for resending two-factor code (in seconds) */
export const RESEND_COOLDOWN_SECONDS = 45;
