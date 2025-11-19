/**
 * Advanced Authentication Features - Centralized Exports
 * 
 * This file provides easy access to all advanced authentication features
 */

// Analytics
export {
  LoginAttemptTracker,
  getLoginAttemptTracker,
  type LoginAttempt,
  type LoginAnalytics,
} from '../analytics/LoginAttemptTracker';

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
} from '../analytics/BehavioralAnalytics';

// Notifications
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
} from '../notifications/SecurityNotificationSystem';

// Passkeys
export {
  PasskeyManager,
  getPasskeyManager,
  type PasskeyCredential,
  type PasskeyRegistrationOptions,
  type PasskeyAuthenticationOptions,
} from '../passkeys/PasskeyManager';

export { default as PasskeyManagement } from '../passkeys/PasskeyManagement';

// Sessions
export {
  AdvancedSessionManager,
  getAdvancedSessionManager,
  type SessionInfo,
  type SessionActivity,
  type SessionStatistics,
} from '../sessions/AdvancedSessionManager';

export { default as SessionManagementUI } from '../sessions/SessionManagementUI';

// Security
export {
  SmartRateLimiter,
  getSmartRateLimiter,
  type RateLimitConfig,
  type RateLimitEntry,
  type BehaviorPattern,
  type RateLimitResult,
} from '../security/SmartRateLimiter';

// Dashboard
export { default as SecurityDashboard } from '../dashboard/SecurityDashboard';

// Backup Codes
export {
  BackupCodesManager,
  getBackupCodesManager,
  type BackupCode,
  type BackupCodesSet,
} from '../backup/BackupCodesManager';

// Re-export existing components for convenience
export { default as EnhancedLoginForm } from '../EnhancedLoginForm';
export { default as EnhancedRegisterForm } from '../EnhancedRegisterForm';

// Utility functions
export const initializeAdvancedAuth = async (userId: string, token: string) => {
  const { getSecurityNotificationSystem } = await import('../notifications/SecurityNotificationSystem');
  const { getAdvancedSessionManager } = await import('../sessions/AdvancedSessionManager');
  const { getBehavioralAnalytics } = await import('../analytics/BehavioralAnalytics');
  const notificationSystem = getSecurityNotificationSystem();
  const sessionManager = getAdvancedSessionManager();
  const behavioralAnalytics = getBehavioralAnalytics();

  // Connect to notification system
  await notificationSystem.connect(userId, token);

  // Initialize session
  await sessionManager.initializeSession(userId, token);

  // Start behavioral tracking
  behavioralAnalytics.initializeTracking(userId);

  return {
    notificationSystem,
    sessionManager,
    behavioralAnalytics,
  };
};

export const cleanupAdvancedAuth = async () => {
  const { getSecurityNotificationSystem } = await import('../notifications/SecurityNotificationSystem');
  const { getBehavioralAnalytics } = await import('../analytics/BehavioralAnalytics');
  const notificationSystem = getSecurityNotificationSystem();
  const behavioralAnalytics = getBehavioralAnalytics();

  // Disconnect notification system
  notificationSystem.disconnect();

  // Stop behavioral tracking
  behavioralAnalytics.stopTracking();
};

