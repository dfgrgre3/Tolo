/**
 * Shared types for authentication API endpoints
 * These types are used by both frontend components and backend API routes
 */

import { ApiSuccessResponse, ApiErrorResponse, ApiResponse, DateString } from './common';
export type { ApiSuccessResponse, ApiErrorResponse, ApiResponse, DateString };

export interface User {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  role: string;
  avatar?: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: DateString | Date | null;
  provider?: 'local' | 'google' | 'facebook';
  createdAt?: DateString | Date;
  // Gamification & Profile
  level?: number;
  xp?: number;
  totalXP?: number;
  xpToNextLevel?: number;
  rank?: string;
  badges?: string[];
  bio?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DeviceFingerprint {
  browser: string;
  os: string;
  screen: string;
  language?: string;
  platform?: string;
  timezone?: string;
  canvas?: string;
  webgl?: string;
  fingerprint?: string;
  [key: string]: unknown;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors?: {
    newDevice?: boolean;
    newLocation?: boolean;
    unusualTime?: boolean;
    [key: string]: unknown;
  };
  recommendations?: string[];
  requireAdditionalAuth?: boolean;
  blockAccess?: boolean;
  deviceFingerprint?: DeviceFingerprint | Record<string, unknown>;
}

// ==================== Login Types ====================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: Record<string, unknown>;
  captchaToken?: string;
}

export interface LoginResponse {
  message?: string;
  token?: string;
  refreshToken?: string;
  sessionId?: string;
  user: User;
  riskAssessment?: RiskAssessment;
  isNewDevice?: boolean;
  accountWasCreated?: boolean; // Indicates if account was auto-created during login
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
  expiresAt?: DateString;
  methods?: string[];
  reason?: string;
  debugCode?: string; // Only in development
  tempToken?: string;
  method?: 'email' | 'totp';
}

export interface LoginErrorResponse {
  error: string;
  code?: string;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
  retryAfterSeconds?: number;
  lockedUntil?: string;
  blockedUntil?: string;
  attempts?: number;
  details?: Record<string, string[]>;
  riskLevel?: string;
}

// ==================== Register Types ====================

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  acceptTerms?: boolean;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
  verificationLink?: string;
  requiresEmailVerification: boolean;
  warning?: string;
}

export interface RegisterErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ==================== Two-Factor Types ====================

export interface TwoFactorVerifyRequest {
  loginAttemptId: string;
  code: string;
  challengeId?: string; // Alternative to loginAttemptId
  trustDevice?: boolean;
}

export interface TwoFactorVerifyResponse {
  message: string;
  token: string;
  refreshToken?: string;
  sessionId?: string;
  user: User;
  remainingBackupCodes?: number;
}

export interface TwoFactorErrorResponse {
  error: string;
  code?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  backupCodes: string[];
  qrCode?: string;
  message: string;
}

// ==================== Biometric Types ====================

export interface BiometricChallengeRequest {
  type: 'authenticate' | 'register';
  email?: string;
}

export interface BiometricChallengeResponse {
  challenge: string;
}

export interface BiometricVerifyRequest {
  credential: unknown;
  challenge: string;
}

export interface BiometricVerifyResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

// ==================== Generic API Response ====================

// Re-exported from ./common


// ==================== Rate Limiting ====================

export interface RateLimitResponse {
  allowed: boolean;
  attempts: number;
  remainingTime?: number;
  lockedUntil?: number;
  retryAfterSeconds?: number;
}

// ==================== Session Types ====================

export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: DateString;
  expiresAt: DateString;
  lastActivity: DateString;
}

export interface SessionListResponse {
  sessions: Session[];
  currentSessionId?: string;
}

// ==================== Security Log Types ====================

export interface SecurityLog {
  id: string;
  userId: string;
  eventType: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  createdAt: DateString;
}

export interface SecurityLogsResponse {
  logs: SecurityLog[];
  total: number;
  page?: number;
  limit?: number;
}

