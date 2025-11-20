/**
 * Auth components barrel export
 * Centralized exports for all auth-related components
 * 
 * @optimized - All components are optimized for performance
 */

// Main components
export { AuthGuard } from './AuthGuard';
export type { AuthGuardProps } from './AuthGuard';
export { default as ChangePassword } from './ChangePassword';
// ⚠️ NOTE: EnhancedLoginForm.old.tsx does NOT exist. Use EnhancedLoginForm only.
export { default as EnhancedLoginForm } from './EnhancedLoginForm';
export { default as EnhancedRegisterForm } from './EnhancedRegisterForm';
export { AuthSessionWrapper } from './AuthSessionWrapper';
// Legacy export - kept for backward compatibility
export { AuthSessionWrapper as SessionProviderWrapper } from './AuthSessionWrapper';

// ============================================
// Unified Auth System (NEW - Recommended) ⭐
// ============================================
// ⚠️ IMPORTANT: استخدم @/contexts/auth-context كالمصدر الوحيد الموثوق
export { UnifiedAuthProvider, useUnifiedAuth, UnifiedAuthContext } from '@/contexts/auth-context';
export type { UnifiedAuthContextType, User as UnifiedUser } from '@/contexts/auth-context';

// ============================================
// Legacy Auth System - للتوافق فقط ⚠️
// ============================================
// ❌ لا تستخدم في الكود الجديد
// ✅ استخدم useUnifiedAuth و UnifiedAuthProvider بدلاً منها
// 
// ⚠️ للتوافق مع الكود القديم فقط:
// يمكنك استيراد النظام القديم مباشرة من:
//   - @/components/auth/UserProvider (AuthProvider, useAuth)
//   - @/hooks/use-auth (useAuth wrapper يستخدم useUnifiedAuth)
// 
// لكن يُنصح بشدة بالترقية إلى النظام الموحد

// Security components
export { default as SessionManager } from './SessionManager';
export { CaptchaWidget } from './CaptchaWidget';
export { default as BiometricManagement } from './BiometricManagement';
export { default as TwoFactorSettings } from './TwoFactorSettings';
export { default as TOTPSetup } from './TOTPSetup';
export { default as SecurityLog } from './SecurityLog';
export { default as SecurityOnboarding } from './SecurityOnboarding';
export { default as RecoveryCodesDisplay } from './RecoveryCodesDisplay';

// Utilities
export * from './utils/password-strength';
export type { PasswordStrengthDisplay } from './utils/password-strength';
export * from './utils/error-handling';
export type { ApiError } from './utils/error-handling';

// Types
// Note: SessionProviderProps is now defined locally in SessionProviderWrapper.tsx
// to avoid any next-auth dependencies
export type { SessionData } from './types/session';

// Login flow hooks
export { useLoginFlow } from './login/useLoginFlow';
export type { LoginStep, CredentialsState, TwoFactorState } from './login/types';

// Registration flow hooks
export { useRegistrationFlow } from './register/useRegistrationFlow';
export type { RegistrationStep, RegistrationProfileState, RegistrationSecurityState } from './register/types';

// Auth UI Components
export * from './components';

// Auth Hooks
export * from './hooks';

// Login API utilities - use @/lib/api/auth-client instead
// export * from './utils/loginApi'; // Deprecated - use @/lib/api/auth-client

// ============================================
// 🚀 ADVANCED AUTHENTICATION FEATURES
// ============================================

// Analytics & Tracking
export {
  LoginAttemptTracker,
  getLoginAttemptTracker,
  type LoginAttempt,
  type LoginAnalytics,
} from './analytics/LoginAttemptTracker';

export {
  BehavioralAnalytics,
  getBehavioralAnalytics,
  type UserBehavior,
  type TypingPattern,
  type MousePattern,
  type NavigationPattern,
  type TimePattern,
  type DevicePattern,
  type AnomalyDetection,
} from './analytics/BehavioralAnalytics';

// Security Notifications
export {
  SecurityNotificationSystem,
  getSecurityNotificationSystem,
  notifyLoginSuccess,
  notifyNewDevice,
  notifySuspiciousActivity,
  notifyPasswordChanged,
  notifyAccountLocked,
  type SecurityNotification,
  type NotificationPriority,
  type NotificationType,
  type NotificationPreferences,
} from './notifications/SecurityNotificationSystem';

// Passkeys (WebAuthn)
export {
  PasskeyManager,
  getPasskeyManager,
  type PasskeyCredential,
  type PasskeyRegistrationOptions,
  type PasskeyAuthenticationOptions,
} from './passkeys/PasskeyManager';

export { default as PasskeyManagement } from './passkeys/PasskeyManagement';

// Advanced Session Management
export {
  AdvancedSessionManager,
  getAdvancedSessionManager,
  type SessionInfo,
  type SessionActivity,
  type SessionStatistics,
} from './sessions/AdvancedSessionManager';

export { default as SessionManagementUI } from './sessions/SessionManagementUI';

// Smart Rate Limiting
export {
  SmartRateLimiter,
  getSmartRateLimiter,
  type RateLimitConfig,
  type RateLimitEntry,
  type BehaviorPattern,
  type RateLimitResult,
} from './security/SmartRateLimiter';

// Security Dashboard
export { default as SecurityDashboard } from './dashboard/SecurityDashboard';

// Backup Codes
export {
  BackupCodesManager,
  getBackupCodesManager,
  type BackupCode,
  type BackupCodesSet,
} from './backup/BackupCodesManager';

// Advanced Features - Centralized
export * from './advanced';

// ============================================
// 🎯 QUICK START HELPERS
// ============================================

/**
 * Initialize all advanced authentication features
 * Call this after successful login
 */
export { initializeAdvancedAuth, cleanupAdvancedAuth } from './advanced';