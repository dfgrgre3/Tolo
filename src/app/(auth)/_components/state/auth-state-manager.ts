/**
 * Centralized Authentication State Manager
 * Manages all authentication-related state with proper typing and error handling
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  User,
  Session,
  LoginFormData,
  LoginResponse,
  TwoFactorData,
  PasswordStrengthResult,
  SecurityEvent,
  FieldErrors,
  RiskAssessment,
  DeviceFingerprint,
  ApiError,
} from '../../_types/core.types';

// ============================================
// STATE INTERFACES
// ============================================

/**
 * Authentication state interface
 */
export interface AuthState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Login state
  loginForm: LoginFormData;
  loginAttempts: number;
  isLoginLocked: boolean;
  lockoutSeconds: number | null;

  // Two-factor state
  requiresTwoFactor: boolean;
  twoFactorData: TwoFactorData | null;

  // Session state
  sessions: Session[];
  currentSessionId: string | null;

  // Security state
  deviceFingerprint: DeviceFingerprint | null;
  riskAssessment: RiskAssessment | null;
  securityEvents: SecurityEvent[];

  // Form state
  fieldErrors: FieldErrors;
  formErrorMessage: string | null;
  formErrorCode: string | null;

  // Password state
  passwordStrength: PasswordStrengthResult | null;
  showPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;

  // UI state
  focusedField: string | null;
  isShaking: boolean;
  requiresCaptcha: boolean;
  captchaToken: string | null;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  // User actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;

  // Login actions
  updateLoginForm: (field: keyof LoginFormData, value: string | boolean) => void;
  resetLoginForm: () => void;
  incrementLoginAttempts: () => void;
  setLoginLocked: (isLocked: boolean, seconds?: number) => void;

  // Two-factor actions
  setRequiresTwoFactor: (requires: boolean) => void;
  setTwoFactorData: (data: TwoFactorData | null) => void;

  // Session actions
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSessionId: (sessionId: string | null) => void;

  // Security actions
  setDeviceFingerprint: (fingerprint: DeviceFingerprint | null) => void;
  setRiskAssessment: (assessment: RiskAssessment | null) => void;
  addSecurityEvent: (event: SecurityEvent) => void;

  // Form actions
  setFieldErrors: (errors: FieldErrors) => void;
  clearFieldErrors: () => void;
  setFormErrorMessage: (message: string | null) => void;
  setFormErrorCode: (code: string | null) => void;
  clearFormErrors: () => void;

  // Password actions
  setPasswordStrength: (strength: PasswordStrengthResult | null) => void;
  setShowPassword: (show: boolean) => void;
  setShowNewPassword: (show: boolean) => void;
  setShowConfirmPassword: (show: boolean) => void;

  // UI actions
  setFocusedField: (field: string | null) => void;
  setShaking: (shaking: boolean) => void;
  setRequiresCaptcha: (requires: boolean) => void;
  setCaptchaToken: (token: string | null) => void;

  // Reset actions
  resetAuthState: () => void;
  resetLoginState: () => void;
  resetFormState: () => void;
}

/**
 * Combined auth store type
 */
export type AuthStore = AuthState & AuthActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: AuthState = {
  // User state
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Login state
  loginForm: {
    email: '',
    password: '',
    rememberMe: false,
  },
  loginAttempts: 0,
  isLoginLocked: false,
  lockoutSeconds: null,

  // Two-factor state
  requiresTwoFactor: false,
  twoFactorData: null,

  // Session state
  sessions: [],
  currentSessionId: null,

  // Security state
  deviceFingerprint: null,
  riskAssessment: null,
  securityEvents: [],

  // Form state
  fieldErrors: {},
  formErrorMessage: null,
  formErrorCode: null,

  // Password state
  passwordStrength: null,
  showPassword: false,
  showNewPassword: false,
  showConfirmPassword: false,

  // UI state
  focusedField: null,
  isShaking: false,
  requiresCaptcha: false,
  captchaToken: null,
};

// ============================================
// STATE MANAGER
// ============================================

/**
 * Create authentication store with Zustand
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // User actions
      setUser: (user) => set({ user }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // Login actions
      updateLoginForm: (field, value) =>
        set((state) => ({
          loginForm: { ...state.loginForm, [field]: value },
        })),
      resetLoginForm: () => set({ loginForm: initialState.loginForm }),
      incrementLoginAttempts: () =>
        set((state) => ({ loginAttempts: state.loginAttempts + 1 })),
      setLoginLocked: (isLocked, seconds) =>
        set({ isLoginLocked: isLocked, lockoutSeconds: seconds || null }),

      // Two-factor actions
      setRequiresTwoFactor: (requires) => set({ requiresTwoFactor: requires }),
      setTwoFactorData: (data) => set({ twoFactorData: data }),

      // Session actions
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),
      removeSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
        })),
      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),

      // Security actions
      setDeviceFingerprint: (fingerprint) => set({ deviceFingerprint: fingerprint }),
      setRiskAssessment: (assessment) => set({ riskAssessment: assessment }),
      addSecurityEvent: (event) =>
        set((state) => ({
          securityEvents: [event, ...state.securityEvents],
        })),

      // Form actions
      setFieldErrors: (errors) => set({ fieldErrors: errors }),
      clearFieldErrors: () => set({ fieldErrors: {} }),
      setFormErrorMessage: (message) => set({ formErrorMessage: message }),
      setFormErrorCode: (code) => set({ formErrorCode: code }),
      clearFormErrors: () => set({
        fieldErrors: {},
        formErrorMessage: null,
        formErrorCode: null,
      }),

      // Password actions
      setPasswordStrength: (strength) => set({ passwordStrength: strength }),
      setShowPassword: (show) => set({ showPassword: show }),
      setShowNewPassword: (show) => set({ showNewPassword: show }),
      setShowConfirmPassword: (show) => set({ showConfirmPassword: show }),

      // UI actions
      setFocusedField: (field) => set({ focusedField: field }),
      setShaking: (shaking) => set({ isShaking: shaking }),
      setRequiresCaptcha: (requires) => set({ requiresCaptcha: requires }),
      setCaptchaToken: (token) => set({ captchaToken: token }),

      // Reset actions
      resetAuthState: () => set(initialState),
      resetLoginState: () => set({
        loginForm: initialState.loginForm,
        loginAttempts: 0,
        isLoginLocked: false,
        lockoutSeconds: null,
        requiresTwoFactor: false,
        twoFactorData: null,
      }),
      resetFormState: () => set({
        fieldErrors: {},
        formErrorMessage: null,
        formErrorCode: null,
        isShaking: false,
        requiresCaptcha: false,
        captchaToken: null,
      }),
    })),
    {
      name: 'auth-store',
    }
  )
);

// ============================================
// SELECTORS
// ============================================

/**
 * Get current user
 */
export const useCurrentUser = () => useAuthStore((state) => state.user);

/**
 * Get authentication status
 */
export const useAuthStatus = () => useAuthStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
}));

/**
 * Get login form state
 */
export const useLoginFormState = () => useAuthStore((state) => ({
  formData: state.loginForm,
  isLoading: state.isLoading,
  requiresTwoFactor: state.requiresTwoFactor,
  fieldErrors: state.fieldErrors,
  formErrorMessage: state.formErrorMessage,
  formErrorCode: state.formErrorCode,
  isShaking: state.isShaking,
  isLoginLocked: state.isLoginLocked,
  lockoutSeconds: state.lockoutSeconds,
  loginAttempts: state.loginAttempts,
}));

/**
 * Get security state
 */
export const useSecurityState = () => useAuthStore((state) => ({
  deviceFingerprint: state.deviceFingerprint,
  riskAssessment: state.riskAssessment,
  securityEvents: state.securityEvents,
  requiresCaptcha: state.requiresCaptcha,
  captchaToken: state.captchaToken,
}));

/**
 * Get session state
 */
export const useSessionState = () => useAuthStore((state) => ({
  sessions: state.sessions,
  currentSessionId: state.currentSessionId,
  currentSession: state.sessions.find(s => s.id === state.currentSessionId),
}));

/**
 * Get password state
 */
export const usePasswordState = () => useAuthStore((state) => ({
  passwordStrength: state.passwordStrength,
  showPassword: state.showPassword,
  showNewPassword: state.showNewPassword,
  showConfirmPassword: state.showConfirmPassword,
}));

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Handle API errors with proper state updates
 */
export const handleAuthError = (
  error: ApiError,
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void
) => {
  // Update form errors
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
    set({
      isLoginLocked: true,
      lockoutSeconds: error.retryAfterSeconds,
      formErrorMessage: `تم حظر الحساب مؤقتاً. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة`,
      formErrorCode: error.code,
      isShaking: true,
    });
  } else if (error.requiresCaptcha) {
    set({
      requiresCaptcha: true,
      formErrorMessage: 'يرجى إكمال التحقق من CAPTCHA للمتابعة',
      formErrorCode: error.code,
      isShaking: true,
    });
  } else {
    const fieldErrors: FieldErrors = {};

    if (error.error?.toLowerCase().includes('email')) {
      fieldErrors.email = error.error;
    } else if (error.error?.toLowerCase().includes('password')) {
      fieldErrors.password = error.error;
    } else {
      fieldErrors.password = error.error || 'حدث خطأ غير متوقع';
    }

    set({
      fieldErrors,
      formErrorMessage: error.error || null,
      formErrorCode: error.code || null,
      isShaking: true,
    });
  }
};

/**
 * Process successful login
 */
export const processLoginSuccess = (
  response: LoginResponse,
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void
) => {
  // Reset form state
  set({
    loginForm: initialState.loginForm,
    loginAttempts: 0,
    isLoginLocked: false,
    lockoutSeconds: null,
    requiresTwoFactor: false,
    twoFactorData: null,
    fieldErrors: {},
    formErrorMessage: null,
    formErrorCode: null,
    isShaking: false,
    requiresCaptcha: false,
    captchaToken: null,
  });

  // Update user state
  if (response.user) {
    set({
      user: response.user,
      isAuthenticated: true,
    });
  }

  // Handle two-factor
  if (response.requiresTwoFactor && response.loginAttemptId) {
    set({
      requiresTwoFactor: true,
      twoFactorData: {
        loginAttemptId: response.loginAttemptId,
        code: '',
      },
    });
  }

  // Handle risk assessment
  if (response.riskAssessment) {
    set({ riskAssessment: response.riskAssessment });
  }
};
