/**
 * Registration flow types
 * Type definitions for registration flow components and hooks
 */

/**
 * Available steps in the registration flow
 */
export type RegistrationStep = 'profile' | 'security' | 'success';

/**
 * User profile information during registration
 */
export interface RegistrationProfileState {
  /** User's full name */
  fullName: string;
  /** User's email address */
  email: string;
}

/**
 * Security settings during registration
 */
export interface RegistrationSecurityState {
  /** User's password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
  /** Whether user accepted terms and conditions */
  acceptTerms: boolean;
  /** Whether to enable two-factor authentication */
  enableTwoFactor: boolean;
  /** Whether to opt-in for marketing emails */
  marketingOptIn: boolean;
}

/**
 * Feedback message state for registration flow
 */
export interface RegistrationFeedbackState {
  /** Type of feedback message */
  type: 'error' | 'success';
  /** Feedback message content */
  message: string;
}

/**
 * Form validation errors for registration
 */
export interface RegistrationFormErrors {
  /** Full name field error message */
  fullName?: string;
  /** Email field error message */
  email?: string;
  /** Password field error message */
  password?: string;
  /** Confirm password field error message */
  confirmPassword?: string;
  /** Terms acceptance error message */
  acceptTerms?: string;
}

/**
 * Result of successful registration
 */
export interface RegistrationResult {
  /** Created user ID */
  userId: string;
  /** User's email address */
  email: string;
  /** User's full name */
  fullName?: string | null;
  /** Email verification link (if applicable) */
  verificationLink?: string;
  /** Whether marketing opt-in was successfully applied */
  marketingOptInApplied?: boolean;
  /** Two-factor authentication setup data (if enabled) */
  twoFactorSetup?: {
    /** TOTP secret for authenticator app */
    secret: string;
    /** Backup recovery codes */
    backupCodes: string[];
    /** Optional setup message */
    message?: string;
  };
  /** Post-registration actions/notifications */
  postActions?: Array<{
    /** Action type */
    type: 'success' | 'info' | 'warning' | 'error';
    /** Action message */
    message: string;
  }>;
}

/**
 * Password requirement validation result
 */
export interface PasswordRequirement {
  /** Requirement description */
  label: string;
  /** Whether the requirement is met */
  met: boolean;
}
