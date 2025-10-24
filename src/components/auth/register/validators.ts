import { PASSWORD_REQUIREMENT_LABELS, PASSWORD_STRENGTH_LEVELS } from './constants';
import type {
  PasswordRequirement,
  RegistrationProfileState,
  RegistrationSecurityState,
  RegistrationFormErrors,
} from './types';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordEvaluation {
  score: number;
  label: string;
  requirements: PasswordRequirement[];
}

export const MIN_PASSWORD_LENGTH = 8;

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
