/**
 * Types and interfaces for the Enhanced Login Form
 */

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    lastLogin?: string;
  };
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
  };
  sessionId?: string;
  accountWasCreated?: boolean;
}

export interface LoginErrorResponse {
  error: string;
  code: string;
  status?: number;
  retryAfterSeconds?: number;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
}

export interface FieldErrors {
  email?: string;
  password?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | null;

export interface DeviceFingerprint {
  browser: string;
  os: string;
  screen: string;
  [key: string]: any;
}

