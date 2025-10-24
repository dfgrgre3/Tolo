export type RegistrationStep = 'profile' | 'security' | 'success';

export interface RegistrationProfileState {
  fullName: string;
  email: string;
}

export interface RegistrationSecurityState {
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  enableTwoFactor: boolean;
  marketingOptIn: boolean;
}

export interface RegistrationFeedbackState {
  type: 'error' | 'success';
  message: string;
}

export interface RegistrationFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

export interface RegistrationResult {
  userId: string;
  email: string;
  fullName?: string | null;
  verificationLink?: string;
  marketingOptInApplied?: boolean;
  twoFactorSetup?: {
    secret: string;
    backupCodes: string[];
    message?: string;
  };
  postActions?: Array<{
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
  }>;
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}
