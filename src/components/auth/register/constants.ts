/**
 * Registration flow constants
 * Centralized constants for registration flow steps and labels
 */

import type { RegistrationStep } from './types';

/** All possible registration steps in order */
export const REGISTRATION_STEPS: RegistrationStep[] = [
  'profile',
  'security',
  'success',
];

/** Localized labels for each registration step */
export const REGISTRATION_STEP_LABELS: Record<RegistrationStep, string> = {
  profile: 'البيانات الأساسية',
  security: 'التأمين وإعداد كلمة المرور',
  success: 'تفعيل الحساب',
};

/** Localized labels for password requirements */
export const PASSWORD_REQUIREMENT_LABELS: Record<string, string> = {
  length: 'ثمانية أحرف على الأقل',
  upper: 'حرف كبير واحد على الأقل',
  lower: 'حرف صغير واحد على الأقل',
  number: 'رقم واحد على الأقل',
  symbol: 'رمز خاص واحد على الأقل',
};

/** Password strength levels with styling */
export const PASSWORD_STRENGTH_LEVELS = [
  { minScore: 90, label: 'ممتاز', className: 'bg-emerald-600 text-white' },
  { minScore: 70, label: 'قوي', className: 'bg-emerald-500 text-white' },
  { minScore: 50, label: 'جيد', className: 'bg-amber-500 text-white' },
  { minScore: 30, label: 'متوسط', className: 'bg-amber-400 text-slate-900' },
  { minScore: 0, label: 'ضعيف', className: 'bg-rose-500 text-white' },
] as const;

/** Minimum acceptable password strength score */
export const MIN_PASSWORD_STRENGTH_SCORE = 50;
