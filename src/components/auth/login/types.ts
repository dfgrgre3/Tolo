export type LoginStep = 'credentials' | 'two-factor' | 'success';

export interface TwoFactorState {
  loginAttemptId: string;
  expiresAt?: string;
  methods: string[];
  debugCode?: string;
}

export interface CredentialsState {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFeedbackState {
  type: 'error' | 'success';
  message: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}
