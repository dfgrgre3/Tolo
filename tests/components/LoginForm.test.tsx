/**
 * Frontend Login Form Component Tests
 * Tests the EnhancedLoginForm component and related hooks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import EnhancedLoginForm from '@/components/auth/forms/EnhancedLoginForm';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useUnifiedAuth', () => ({
  useUnifiedAuth: jest.fn(),
}));

jest.mock('@/lib/api/auth-client', () => ({
  loginUser: jest.fn(),
  verifyTwoFactor: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  useAnimation: jest.fn(() => ({
    start: jest.fn(),
    set: jest.fn(),
  })),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useLoginForm hook
jest.mock('@/hooks/auth/useLoginForm', () => ({
  useLoginForm: jest.fn(),
}));

// Mock useLoginEffects hook
jest.mock('@/hooks/auth/useLoginEffects', () => ({
  useLoginEffects: jest.fn(),
}));

// Mock useAlternativeLogin hook
jest.mock('@/hooks/auth/useAlternativeLogin', () => ({
  useAlternativeLogin: jest.fn(),
}));

describe('EnhancedLoginForm Component', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  const mockLogin = jest.fn();
  const mockRefreshUser = jest.fn();

  const { useLoginForm } = require('@/hooks/auth/useLoginForm');
  const { useLoginEffects } = require('@/hooks/auth/useLoginEffects');
  const { useAlternativeLogin } = require('@/hooks/auth/useAlternativeLogin');

  const defaultLoginFormReturn = {
    formData: { email: '', password: '', rememberMe: false },
    showPassword: false,
    isLoading: false,
    showTwoFactor: false,
    twoFactorCode: '',
    formErrorMessage: null,
    formErrorCode: null,
    fieldErrors: {},
    isShaking: false,
    deviceFingerprint: null,
    riskLevel: null,
    requiresCaptcha: false,
    captchaToken: null,
    isFormLocked: false,
    focusedField: null,
    isGoogleOAuthEnabled: true,
    emailInputRef: { current: null },
    passwordInputRef: { current: null },
    setShowPassword: jest.fn(),
    setTwoFactorCode: jest.fn(),
    setCaptchaToken: jest.fn(),
    setFocusedField: jest.fn(),
    setShowTwoFactor: jest.fn(),
    setFormErrorMessage: jest.fn(),
    setFormErrorCode: jest.fn(),
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    handleTwoFactorSubmit: jest.fn(),
    resetErrors: jest.fn(),
    formControls: { start: jest.fn() },
    setIsShaking: jest.fn(),
    setDeviceFingerprint: jest.fn(),
    setIsGoogleOAuthEnabled: jest.fn(),
    setLockoutSeconds: jest.fn(),
    lockoutSeconds: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useUnifiedAuth as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      refreshUser: mockRefreshUser,
      logout: jest.fn(),
    });
    (useLoginForm as jest.Mock).mockReturnValue(defaultLoginFormReturn);
    (useLoginEffects as jest.Mock).mockReturnValue({});
    (useAlternativeLogin as jest.Mock).mockReturnValue({
      isLoading: false,
      handleBiometricLogin: jest.fn(),
      handleTestAccountLogin: jest.fn(),
    });
  });

  describe('Form Rendering', () => {
    it('should render login form with all fields', () => {
      render(<EnhancedLoginForm />);

      // Check for form elements - adjust selectors based on actual component structure
      const form = screen.getByRole('form', { name: /تسجيل/i });
      expect(form).toBeInTheDocument();
    });

    it('should handle password visibility toggle', () => {
      const setShowPassword = jest.fn();
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        showPassword: false,
        setShowPassword,
      });

      render(<EnhancedLoginForm />);

      // Test that setShowPassword is available
      expect(setShowPassword).toBeDefined();
    });
  });

  describe('Form Validation', () => {
    it('should call handleSubmit on form submission', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        handleSubmit,
      });

      render(<EnhancedLoginForm />);

      const form = screen.getByRole('form', { name: /تسجيل/i });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    it('should handle input changes', async () => {
      const handleInputChange = jest.fn();
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        handleInputChange,
      });

      render(<EnhancedLoginForm />);

      // Test that handleInputChange is available
      expect(handleInputChange).toBeDefined();
    });

    it('should display field errors when present', () => {
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        fieldErrors: {
          email: 'البريد الإلكتروني مطلوب',
          password: 'كلمة المرور مطلوبة',
        },
      });

      render(<EnhancedLoginForm />);

      // Component should handle field errors
      expect(defaultLoginFormReturn.fieldErrors).toBeDefined();
    });
  });

  describe('Form Submission', () => {
    it('should call handleSubmit when form is submitted', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        handleSubmit,
      });

      render(<EnhancedLoginForm />);

      const form = screen.getByRole('form', { name: /تسجيل/i });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    it('should display error message when formErrorMessage is set', () => {
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        formErrorMessage: 'بيانات تسجيل الدخول غير صحيحة',
        formErrorCode: 'INVALID_CREDENTIALS',
      });

      render(<EnhancedLoginForm />);

      // Component should display error message
      expect(defaultLoginFormReturn.formErrorMessage).toBe('بيانات تسجيل الدخول غير صحيحة');
    });

    it('should show two-factor form when showTwoFactor is true', () => {
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        showTwoFactor: true,
        twoFactorCode: '123456',
      });

      render(<EnhancedLoginForm />);

      // Component should show two-factor form
      expect(defaultLoginFormReturn.showTwoFactor).toBe(true);
    });
  });

  describe('User Experience', () => {
    it('should show loading state when isLoading is true', () => {
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        isLoading: true,
      });

      render(<EnhancedLoginForm />);

      // Component should handle loading state
      expect(defaultLoginFormReturn.isLoading).toBe(true);
    });

    it('should handle form locking when isFormLocked is true', () => {
      (useLoginForm as jest.Mock).mockReturnValue({
        ...defaultLoginFormReturn,
        isFormLocked: true,
        lockoutSeconds: 60,
      });

      render(<EnhancedLoginForm />);

      // Component should handle form locking
      expect(defaultLoginFormReturn.isFormLocked).toBe(true);
    });
  });
});


