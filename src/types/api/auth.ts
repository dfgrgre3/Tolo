/**
 * Shared types for authentication API endpoints
 * These types are used by both frontend components and backend API routes
 */

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string | Date | null;
  provider?: 'local' | 'google' | 'facebook';
  createdAt?: string | Date;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors?: {
    newDevice?: boolean;
    newLocation?: boolean;
    unusualTime?: boolean;
    [key: string]: any;
  };
  recommendations?: string[];
  requireAdditionalAuth?: boolean;
  blockAccess?: boolean;
}

// ==================== Login Types ====================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: any;
  captchaToken?: string;
}

export interface LoginResponse {
  message?: string;
  token: string;
  refreshToken?: string;
  sessionId?: string;
  user: User;
  riskAssessment?: RiskAssessment;
  isNewDevice?: boolean;
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
  expiresAt?: string;
  methods?: string[];
  reason?: string;
  debugCode?: string; // Only in development
}

export interface LoginErrorResponse {
  error: string;
  code?: string;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
  retryAfterSeconds?: number;
  lockedUntil?: string;
  attempts?: number;
  details?: Record<string, string[]>;
  riskLevel?: string;
}

// ==================== Register Types ====================

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
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
  credential: any;
  challenge: string;
}

export interface BiometricVerifyResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

// ==================== Generic API Response ====================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
  status?: number;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

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
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
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
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SecurityLogsResponse {
  logs: SecurityLog[];
  total: number;
  page?: number;
  limit?: number;
}

