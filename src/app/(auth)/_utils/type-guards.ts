/**
 * Type guards for authentication system
 * Provides runtime type checking utilities
 */

import type {
  User,
  LoginResponse,
  TwoFactorResponse,
  ApiError,
  Session,
  DeviceFingerprint,
} from '../types/core.types';

/**
 * Type guard for User object
 */
export function isUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const user = obj as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    user.id.trim().length > 0 &&
    typeof user.email === 'string' &&
    user.email.trim().length > 0 &&
    typeof user.role === 'string' &&
    ['user', 'admin', 'moderator'].includes(user.role) &&
    typeof user.emailVerified === 'boolean' &&
    typeof user.twoFactorEnabled === 'boolean' &&
    typeof user.provider === 'string' &&
    ['local', 'google', 'apple', 'microsoft'].includes(user.provider)
  );
}

/**
 * Type guard for LoginResponse
 */
export function isLoginResponse(obj: unknown): obj is LoginResponse {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const response = obj as Record<string, unknown>;
  return (
    typeof response.token === 'string' &&
    response.token.trim().length > 0 &&
    isUser(response.user)
  );
}

/**
 * Type guard for TwoFactorResponse
 */
export function isTwoFactorResponse(obj: unknown): obj is TwoFactorResponse {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const response = obj as Record<string, unknown>;
  return (
    typeof response.token === 'string' &&
    response.token.trim().length > 0 &&
    isUser(response.user)
  );
}

/**
 * Type guard for ApiError
 */
export function isApiError(obj: unknown): obj is ApiError {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const error = obj as Record<string, unknown>;
  return (
    typeof error.error === 'string' &&
    error.error.trim().length > 0 &&
    typeof error.code === 'string' &&
    error.code.trim().length > 0
  );
}

/**
 * Type guard for Session
 */
export function isSession(obj: unknown): obj is Session {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const session = obj as Record<string, unknown>;
  return (
    typeof session.id === 'string' &&
    session.id.trim().length > 0 &&
    typeof session.userId === 'string' &&
    session.userId.trim().length > 0 &&
    typeof session.userAgent === 'string' &&
    typeof session.ip === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof session.lastAccessed === 'string' &&
    typeof session.isActive === 'boolean' &&
    typeof session.isCurrent === 'boolean'
  );
}

/**
 * Type guard for DeviceFingerprint
 */
export function isDeviceFingerprint(obj: unknown): obj is DeviceFingerprint {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const fingerprint = obj as Record<string, unknown>;
  return (
    typeof fingerprint.fingerprint === 'string' &&
    fingerprint.fingerprint.trim().length > 0 &&
    !!fingerprint.components &&
    typeof fingerprint.components === 'object' &&
    !Array.isArray(fingerprint.components)
  );
}

/**
 * Type guard for JWT token format
 */
export function isJWTToken(token: unknown): token is string {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return false;
  }

  const parts = token.trim().split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Type guard for email string
 */
export function isEmail(email: unknown): email is string {
  if (typeof email !== 'string' || email.trim().length === 0) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  return (
    emailRegex.test(normalizedEmail) &&
    normalizedEmail.length <= 254 &&
    !normalizedEmail.includes('..') &&
    !normalizedEmail.startsWith('.') &&
    !normalizedEmail.endsWith('.')
  );
}

/**
 * Type guard for password string
 */
export function isPassword(password: unknown): password is string {
  if (typeof password !== 'string') {
    return false;
  }

  return password.length >= 8 && password.length <= 128;
}

/**
 * Type guard for two-factor code
 */
export function isTwoFactorCode(code: unknown): code is string {
  if (typeof code !== 'string') {
    return false;
  }

  const trimmedCode = code.trim();
  return /^\d{6}$/.test(trimmedCode);
}

/**
 * Safe type assertion with validation
 */
export function assertIsUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Invalid user object');
  }
}

/**
 * Safe type assertion for LoginResponse
 */
export function assertIsLoginResponse(obj: unknown): asserts obj is LoginResponse {
  if (!isLoginResponse(obj)) {
    throw new Error('Invalid login response');
  }
}

