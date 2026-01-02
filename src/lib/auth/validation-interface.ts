/**
 * واجهة التحقق الموحدة للبيانات
 * تضمن هذه الواجهة تطبيق التحقق بشكل متسق عبر جميع الطبقات
 */

import { ValidationResult } from './validation';

/**
 * واجهة التحقق الموحدة
 */
export interface IValidator {
  validate(data: unknown): ValidationResult;
}

/**
 * واجهة التحقق من بيانات المصادقة
 */
export interface IAuthValidator {
  validateEmail(email: unknown): ValidationResult;
  validatePassword(password: unknown): ValidationResult;
  validateLoginPassword(password: unknown): ValidationResult;
  validateTwoFactorCode(code: unknown): ValidationResult;
  validateLoginAttemptId(loginAttemptId: unknown): ValidationResult;
  validateLoginCredentials(credentials: {
    email: unknown;
    password: unknown;
  }): ValidationResult;
  validateTwoFactorRequest(request: {
    loginAttemptId?: unknown;
    challengeId?: unknown;
    code: unknown;
  }): ValidationResult;
}

/**
 * فئة التحقق الموحدة
 * تطبق واجهة IAuthValidator باستخدام دوال التحقق من validation.ts
 */
import { 
  validateEmail as validateEmailFn,
  validatePassword as validatePasswordFn,
  validateTwoFactorCode as validateTwoFactorCodeFn,
  validateLoginAttemptId as validateLoginAttemptIdFn,
  validateLoginCredentials as validateLoginCredentialsFn,
  validateTwoFactorRequest as validateTwoFactorRequestFn,
} from './validation';

export class AuthValidator implements IAuthValidator {
  validateEmail(email: unknown): ValidationResult {
    return validateEmailFn(email);
  }

  validatePassword(password: unknown): ValidationResult {
    return validatePasswordFn(password);
  }

  validateTwoFactorCode(code: unknown): ValidationResult {
    return validateTwoFactorCodeFn(code);
  }

  validateLoginAttemptId(loginAttemptId: unknown): ValidationResult {
    return validateLoginAttemptIdFn(loginAttemptId);
  }

  validateLoginCredentials(credentials: {
    email: unknown;
    password: unknown;
  }): ValidationResult {
    return validateLoginCredentialsFn(credentials);
  }

  validateTwoFactorRequest(request: {
    loginAttemptId?: unknown;
    challengeId?: unknown;
    code: unknown;
  }): ValidationResult {
    return validateTwoFactorRequestFn(request);
  }
}

/**
 * نسخة واحدة من AuthValidator للاستخدام في جميع أنحاء التطبيق
 */
export const authValidator = new AuthValidator();
