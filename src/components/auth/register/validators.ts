/**
 * Registration form validators
 * Centralized validation logic for registration forms
 * 
 * @optimized - Efficient validation with early returns
 */

import { PASSWORD_REQUIREMENT_LABELS, PASSWORD_STRENGTH_LEVELS } from './constants';
import type {
  PasswordRequirement,
  RegistrationProfileState,
  RegistrationSecurityState,
  RegistrationFormErrors,
} from './types';

/** Email validation regex pattern */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password evaluation result
 */
interface PasswordEvaluation {
  /** Password strength score (0-100) */
  score: number;
  /** Human-readable strength label */
  label: string;
  /** List of password requirements and their status */
  requirements: PasswordRequirement[];
}

/** Minimum password length requirement */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Evaluate password strength and requirements
 * @param password - Password to evaluate
 * @returns Password evaluation with score, label, and requirements
 */
export function evaluatePassword(password: string): PasswordEvaluation {
  const checks: Array<[keyof typeof PASSWORD_REQUIREMENT_LABELS, boolean]> = [
    ['length', password.length >= MIN_PASSWORD_LENGTH],
    ['upper', /[A-Z]/.test(password)],
    ['lower', /[a-z]/.test(password)],
    ['number', /\d/.test(password)],
    ['symbol', /[^A-Za-z0-9]/.test(password)],
  ];

  let score = 0;

  checks.forEach(([, passed]) => {
    score += passed ? 20 : 0;
  });

  if (password.length >= 12) {
    score += 10;
  }

  if (password.length >= 16) {
    score += 5;
  }

  const requirements: PasswordRequirement[] = checks.map(([key, passed]) => ({
    label: PASSWORD_REQUIREMENT_LABELS[key],
    met: passed,
  }));

  const level =
    PASSWORD_STRENGTH_LEVELS.find(({ minScore }) => score >= minScore) ||
    PASSWORD_STRENGTH_LEVELS[PASSWORD_STRENGTH_LEVELS.length - 1];

  return {
    score: Math.min(score, 100),
    label: level.label,
    requirements,
  };
}

/**
 * Validate profile information step
 * @param state - Profile state to validate
 * @returns Validation result with errors if any
 */
export function validateProfileState(
  state: RegistrationProfileState,
): { valid: boolean; errors: RegistrationFormErrors } {
  const errors: RegistrationFormErrors = {};

  if (!state.fullName.trim()) {
    errors.fullName = 'الاسم الكامل مطلوب';
  }

  const normalizedEmail = state.email.trim();
  if (!normalizedEmail) {
    errors.email = 'البريد الإلكتروني مطلوب';
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate security settings step
 * @param state - Security state to validate
 * @param strengthScore - Password strength score (0-100)
 * @returns Validation result with errors if any
 */
export function validateSecurityState(
  state: RegistrationSecurityState,
  strengthScore: number,
): { valid: boolean; errors: RegistrationFormErrors } {
  const errors: RegistrationFormErrors = {};

  if (!state.password.trim()) {
    errors.password = 'كلمة المرور مطلوبة';
  }

  if (state.password !== state.confirmPassword) {
    errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
  }

  if (!state.acceptTerms) {
    errors.acceptTerms = 'يجب الموافقة على الشروط والأحكام';
  }

  if (strengthScore < 50) {
    errors.password = errors.password
      ? errors.password
      : 'نقترح اختيار كلمة مرور أقوى';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
