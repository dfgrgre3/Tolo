/**
 * Core authentication types
 * Strict TypeScript types for the auth system
 */

// ============================================
// BASE INTERFACES
// ============================================

/**
 * Base API response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  status?: number;
}

/**
 * Base error interface
 */
export interface ApiError {
  error: string;
  code: string;
  status?: number;
  retryAfterSeconds?: number;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
}

// ============================================
// USER INTERFACES
// ============================================

/**
 * User interface with strict typing
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'moderator';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  provider: 'local' | 'google' | 'apple' | 'microsoft';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  securitySettings?: UserSecuritySettings;
}

/**
 * User security settings
 */
export interface UserSecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'totp' | 'sms' | 'email';
  passkeysEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  sessionTimeoutMinutes: number;
  trustedDevices: TrustedDevice[];
}

/**
 * Trusted device interface
 */
export interface TrustedDevice {
  id: string;
  name: string;
  fingerprint: string;
  trustedAt: string;
  lastUsed: string;
  expiresAt?: string;
}

// ============================================
// SESSION INTERFACES
// ============================================

/**
 * Session interface
 */
export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  deviceInfo: DeviceInfo | null;
  createdAt: string;
  expiresAt: string;
  lastAccessed: string;
  isActive: boolean;
  isCurrent: boolean;
  location?: {
    city?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

/**
 * Device information
 */
export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  platform?: string;
  isMobile?: boolean;
  isDesktop?: boolean;
  isTablet?: boolean;
}

// ============================================
// AUTHENTICATION INTERFACES
// ============================================

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: User;
  sessionId?: string;
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
  riskAssessment?: RiskAssessment;
  accountWasCreated?: boolean;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: RiskFactor[];
  recommendedAction?: 'allow' | 'monitor' | 'step_up' | 'block';
}

/**
 * Risk factor
 */
export interface RiskFactor {
  type: 'location' | 'device' | 'timing' | 'network' | 'behavior';
  description: string;
  score: number;
}

/**
 * Two factor verification data
 */
export interface TwoFactorData {
  loginAttemptId: string;
  code: string;
  method?: 'totp' | 'sms' | 'email';
}

/**
 * Two factor verification response
 */
export interface TwoFactorResponse {
  token: string;
  user: User;
  sessionId?: string;
}

/**
 * Passkey credential
 */
export interface PasskeyCredential {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  deviceInfo?: DeviceInfo;
}

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  score: number;
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Password breach result
 */
export interface PasswordBreachResult {
  breached: boolean;
  count?: number;
  message?: string;
}

// ============================================
// SECURITY INTERFACES
// ============================================

/**
 * Security event
 */
export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: SecurityEventType;
  ip: string;
  userAgent: string;
  deviceInfo: DeviceInfo | null;
  location: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Security event type
 */
export type SecurityEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'TWO_FACTOR_REQUESTED'
  | 'TWO_FACTOR_SUCCESS'
  | 'TWO_FACTOR_FAILED'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PASSKEY_ADDED'
  | 'PASSKEY_REMOVED'
  | 'TRUSTED_DEVICE_ADDED'
  | 'TRUSTED_DEVICE_REMOVED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SECURITY_ALERT';

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  identifier: string;
  attempts: number;
  firstAttempt: string;
  lastAttempt: string;
  resetAt: string;
  blocked: boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
}

/**
 * CAPTCHA verification result
 */
export interface CaptchaResult {
  success: boolean;
  score?: number;
  action?: string;
  challenge?: boolean;
}

// ============================================
// ERROR INTERFACES
// ============================================

/**
 * Field errors
 */
export interface FieldErrors {
  [key: string]: string | undefined;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FieldErrors;
}

// ============================================
// UTILITY INTERFACES
// ============================================

/**
 * Device fingerprint
 */
export interface DeviceFingerprint {
  fingerprint: string;
  components: {
    userAgent: string;
    language: string;
    platform: string;
    screen: string;
    timezone: string;
    canvas: string;
    webgl: string;
  };
}

/**
 * Geolocation data
 */
export interface GeoLocation {
  country: string;
  city: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
}

/**
 * Impossible travel detection
 */
export interface ImpossibleTravel {
  detected: boolean;
  distance: number;
  timeDiff: number;
  maxPossibleDistance: number;
}
