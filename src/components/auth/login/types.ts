/**
 * Login flow types
 * Type definitions for login flow components and hooks
 */

/**
 * Available steps in the login flow
 */
export type LoginStep = 'credentials' | 'two-factor' | 'success';

/**
 * State for two-factor authentication during login
 */
export interface TwoFactorState {
  /** Unique identifier for the login attempt */
  loginAttemptId: string;
  /** Expiration timestamp for the 2FA code */
  expiresAt?: string;
  /** Available 2FA methods (email, sms, etc.) */
  methods: string[];
  /** Debug code for development/testing */
  debugCode?: string;
}

/**
 * User credentials for login
 */
export interface CredentialsState {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Whether to remember the user */
  rememberMe: boolean;
}

/**
 * Feedback message state for login flow
 */
export interface LoginFeedbackState {
  /** Type of feedback message */
  type: 'error' | 'success';
  /** Feedback message content */
  message: string;
}

/**
 * Form validation errors for login
 */
export interface LoginFormErrors {
  /** Email field error message */
  email?: string;
  /** Password field error message */
  password?: string;
}
