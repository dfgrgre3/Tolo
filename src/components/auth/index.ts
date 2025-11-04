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
export { default as EnhancedLoginForm } from './EnhancedLoginForm';
export { default as EnhancedRegisterForm } from './EnhancedRegisterForm';
export { SessionProviderWrapper } from './SessionProviderWrapper';
export { AuthProvider, useAuth, AuthContext } from './UserProvider';
export type { User, AuthContextType } from './UserProvider';

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
export type { SessionData, SessionProviderProps } from './types/session';

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

// Login API utilities
export * from './utils/loginApi';
