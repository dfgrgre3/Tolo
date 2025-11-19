/**
 * Custom hook for managing login form state and logic
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { useAnimation } from 'framer-motion';
import { getClientDeviceFingerprint } from '@/lib/security/device-fingerprint';
import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';
import { logger } from '@/lib/logger';
import { safeWindow, isBrowser } from '@/lib/safe-client-utils';
import {
  validateForm,
  validateTwoFactorCode,
  formatLockoutTime,
  getRedirectPath,
  clearStoredRedirect,
} from '../utils/login-form.utils';
import type {
  LoginFormData,
  LoginResponse,
  LoginErrorResponse,
  FieldErrors,
  RiskLevel,
  DeviceFingerprint,
} from '../types/login-form.types';

export const useLoginForm = () => {
  const router = useRouter();
  const { login: unifiedLogin, refreshUser } = useUnifiedAuth();
  const formControls = useAnimation();

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginAttemptId, setLoginAttemptId] = useState('');

  // Error state
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formErrorCode, setFormErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isShaking, setIsShaking] = useState(false);

  // Security state
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // UI state
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState<boolean>(true);

  // Refs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Computed values
  const isFormLocked = lockoutSeconds !== null && lockoutSeconds > 0;

  /**
   * Reset all form errors
   */
  const resetErrors = () => {
    setFieldErrors({});
    setFormErrorMessage(null);
    setFormErrorCode(null);
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * Handle successful login
   * Improved with better validation, error handling, and performance optimizations
   */
  const handleLoginSuccess = async (data: LoginResponse) => {
    // Reset security state immediately
    setRequiresCaptcha(false);
    setCaptchaToken(null);
    setFailedAttempts(0);
    setLockoutSeconds(null);
    resetErrors();

    // Validate response data structure early
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      logger.error('Invalid login response data: not an object', data);
      toast.error('استجابة تسجيل الدخول غير صحيحة');
      setIsLoading(false);
      return;
    }

    // Comprehensive validation with early returns
    try {
      // Validate token presence and format
      if (!data.token || typeof data.token !== 'string') {
        logger.error('Invalid or missing token in response');
        toast.error('رمز المصادقة غير موجود أو غير صحيح');
        setIsLoading(false);
        return;
      }

      const trimmedToken = data.token.trim();
      if (trimmedToken.length === 0) {
        logger.error('Empty token in response');
        toast.error('رمز المصادقة فارغ');
        setIsLoading(false);
        return;
      }

      // Validate JWT token format (should have 3 parts separated by dots)
      const tokenParts = trimmedToken.split('.');
      if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
        logger.error('Invalid JWT token format received');
        toast.error('رمز المصادقة المستلم غير صحيح');
        setIsLoading(false);
        return;
      }

      // Validate user data structure
      if (!data.user || typeof data.user !== 'object' || Array.isArray(data.user)) {
        logger.error('Invalid user data in response: not an object', data.user);
        toast.error('بيانات المستخدم غير صحيحة');
        setIsLoading(false);
        return;
      }

      // Validate required user fields
      if (!data.user.id || typeof data.user.id !== 'string') {
        logger.error('Invalid user ID in response:', data.user.id);
        toast.error('معرف المستخدم غير صحيح');
        setIsLoading(false);
        return;
      }

      const userId = data.user.id.trim();
      if (userId.length === 0) {
        logger.error('Empty user ID in response');
        toast.error('معرف المستخدم فارغ');
        setIsLoading(false);
        return;
      }

      if (!data.user.email || typeof data.user.email !== 'string') {
        logger.error('Invalid user email in response:', data.user.email);
        toast.error('بريد المستخدم غير صحيح');
        setIsLoading(false);
        return;
      }

      const userEmail = data.user.email.trim().toLowerCase();
      if (userEmail.length === 0 || !userEmail.includes('@')) {
        logger.error('Invalid email format in response:', userEmail);
        toast.error('بريد المستخدم غير صحيح');
        setIsLoading(false);
        return;
      }
    } catch (validationError) {
      logger.error('Error validating login response:', validationError);
      toast.error('حدث خطأ أثناء التحقق من استجابة تسجيل الدخول');
      setIsLoading(false);
      return;
    }

    // Prepare user data with validation
    const userData = {
      id: data.user.id.trim(),
      email: data.user.email.trim().toLowerCase(),
      name: data.user.name ? String(data.user.name).trim() : undefined,
      role: (data.user.role && typeof data.user.role === 'string') ? data.user.role : 'user',
      emailVerified: Boolean(data.user.emailVerified),
      twoFactorEnabled: Boolean(data.user.twoFactorEnabled),
      lastLogin: data.user.lastLogin
        ? typeof data.user.lastLogin === 'string'
          ? data.user.lastLogin
          : (data.user.lastLogin && typeof data.user.lastLogin === 'object' && 'toISOString' in data.user.lastLogin
            ? (data.user.lastLogin as Date).toISOString() 
            : String(data.user.lastLogin))
        : undefined,
      provider: 'local' as const,
    };

    try {
      // Use unified auth system with timeout protection
      const loginPromise = unifiedLogin(data.token.trim(), userData, data.sessionId || undefined);
      const timeoutPromise = new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 10000); // 10 second timeout
      });

      await Promise.race([loginPromise, timeoutPromise]);

      // Show success message
      if (data.accountWasCreated) {
        toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح! مرحباً بك!', {
          duration: 4000,
        });
      } else {
        toast.success('تم تسجيل الدخول بنجاح!', { duration: 3000 });
      }

      // Refresh user data in background (non-blocking)
      refreshUser().catch((refreshError) => {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Failed to refresh user data (non-critical):', refreshError);
        }
      });

      resetErrors();
      setIsLoading(false);

      // Get redirect path and navigate
      const redirectPath = getRedirectPath();
      clearStoredRedirect();

      // Use requestAnimationFrame for smoother navigation
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            router.replace(redirectPath);
            // Use replace instead of refresh for better performance
          } catch (navError) {
            logger.error('Navigation error:', navError);
            // Fallback to default redirect
            router.replace('/');
          }
        }, 200); // Reduced delay for better UX
      });
    } catch (loginError) {
      logger.error('Error in login function:', loginError);
      const errorMessage = loginError instanceof Error 
        ? loginError.message 
        : (typeof loginError === 'string' 
          ? loginError 
          : 'حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
      toast.error(errorMessage);
      setIsLoading(false);
      setRequiresCaptcha(false);
      setCaptchaToken(null);
      resetErrors();
    }
  };

  /**
   * Handle login errors
   */
  const handleLoginError = (error: unknown) => {
    const isEmpty = (obj: unknown): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      try {
        return Object.keys(obj).length === 0;
      } catch {
        return false;
      }
    };

    let apiError: LoginErrorResponse;

    if (!error || isEmpty(error)) {
      apiError = {
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (error instanceof Error) {
      apiError = {
        error:
          error.message ||
          'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (typeof error === 'string') {
      apiError = {
        error: error || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (error && typeof error === 'object') {
      const err = error as any;
      const errorMessage =
        err.error ||
        err.message ||
        'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      const errorCode = err.code || 'UNEXPECTED_ERROR';

      apiError = {
        error: errorMessage,
        code: errorCode,
        ...(err.status !== undefined && { status: err.status }),
        ...(err.retryAfterSeconds !== undefined && {
          retryAfterSeconds: err.retryAfterSeconds,
        }),
        ...(err.requiresCaptcha !== undefined && {
          requiresCaptcha: err.requiresCaptcha,
        }),
        ...(err.failedAttempts !== undefined && {
          failedAttempts: err.failedAttempts,
        }),
      };
    } else {
      apiError = {
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    }

    if (!apiError.error || !apiError.code) {
      apiError = {
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    }

    const errorMessage = apiError.error;
    const errorCode = apiError.code;

    // Handle rate limiting
    if (errorCode === 'RATE_LIMITED' && apiError.retryAfterSeconds) {
      const safeRetrySeconds = Math.max(1, Math.round(apiError.retryAfterSeconds));
      setLockoutSeconds(safeRetrySeconds);
      const formattedCountdown = formatLockoutTime(safeRetrySeconds);
      const formattedMessage = `${errorMessage} (${formattedCountdown})`;
      toast.error(formattedMessage, { duration: 5000 });
      setFormErrorMessage(formattedMessage);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
      setIsLoading(false);
      return;
    }

    // Handle CAPTCHA requirements
    if (apiError.requiresCaptcha) {
      setRequiresCaptcha(true);
      setFailedAttempts(apiError.failedAttempts || 0);
      const captchaMessage = 'يرجى إكمال التحقق من CAPTCHA للمتابعة';
      toast.warning(captchaMessage, { duration: 4000 });
      setFormErrorMessage(captchaMessage);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
      setIsLoading(false);
      return;
    }

    // Handle network errors
    if (
      errorCode === 'FETCH_ERROR' ||
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'REQUEST_TIMEOUT' ||
      errorCode === 'NOT_FOUND' ||
      errorCode === 'SERVER_RESPONSE_ERROR' ||
      errorCode === 'SERVER_ERROR' ||
      !navigator.onLine
    ) {
      toast.error(errorMessage, { duration: 5000 });
      setFormErrorMessage(errorMessage || null);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
    } else {
      // Regular error - increment failed attempts
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 3) {
        setRequiresCaptcha(true);
      }

      const errors: FieldErrors = {};
      if (errorMessage.includes('بريد') || errorMessage.toLowerCase().includes('email')) {
        errors.email = errorMessage;
      } else if (
        errorMessage.includes('مرور') ||
        errorMessage.toLowerCase().includes('password')
      ) {
        errors.password = errorMessage;
      } else {
        errors.password = errorMessage;
      }

      setFieldErrors(errors);
      toast.error(errorMessage);
      setFormErrorMessage(errorMessage || null);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    // Check if form is locked
    if (isFormLocked && lockoutSeconds !== null) {
      const waitMessage = `يرجى الانتظار ${formatLockoutTime(lockoutSeconds)} قبل المحاولة مرة أخرى.`;
      toast.warning(waitMessage);
      setFormErrorMessage(waitMessage);
      setFormErrorCode('RATE_LIMITED_ACTIVE');
      setIsShaking(true);
      return;
    }

    // Validate form data
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const validationMessage = Object.values(validation.errors).join(' ') || 'يرجى إدخال جميع الحقول بشكل صحيح';
      toast.error(validationMessage, { duration: 3000 });
      setFormErrorMessage(validationMessage);
      setFormErrorCode('VALIDATION_ERROR');
      setIsShaking(true);
      
      // Focus on first error field
      if (validation.errors.email && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (validation.errors.password && passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
      return;
    }

    setIsLoading(true);
    setIsCreatingAccount(false);
    resetErrors(); // Clear previous errors

    try {
      // Normalize email early with enhanced validation
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // Enhanced email validation before sending
      if (!normalizedEmail || normalizedEmail.length === 0) {
        const errorMsg = 'البريد الإلكتروني مطلوب';
        toast.error(errorMsg);
        setFieldErrors({ email: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('MISSING_EMAIL');
        setIsLoading(false);
        setIsShaking(true);
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
        return;
      }

      // Validate email length (RFC 5321 limit)
      if (normalizedEmail.length > 254) {
        const errorMsg = 'البريد الإلكتروني طويل جداً';
        toast.error(errorMsg);
        setFieldErrors({ email: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('EMAIL_TOO_LONG');
        setIsLoading(false);
        setIsShaking(true);
        return;
      }

      // Enhanced email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail) || normalizedEmail.length < 5) {
        const errorMsg = 'صيغة البريد الإلكتروني غير صحيحة';
        toast.error(errorMsg);
        setFieldErrors({ email: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('INVALID_EMAIL_FORMAT');
        setIsLoading(false);
        setIsShaking(true);
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
        return;
      }

      // Additional security: Check for potentially malicious email patterns
      if (normalizedEmail.includes('..') || normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
        const errorMsg = 'صيغة البريد الإلكتروني غير صحيحة';
        toast.error(errorMsg);
        setFieldErrors({ email: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('INVALID_EMAIL_FORMAT');
        setIsLoading(false);
        setIsShaking(true);
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
        return;
      }

      // Validate password length (security best practice)
      if (formData.password.length < 8) {
        const errorMsg = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
        toast.error(errorMsg);
        setFieldErrors({ password: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('PASSWORD_TOO_SHORT');
        setIsLoading(false);
        setIsShaking(true);
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
        return;
      }

      if (formData.password.length > 128) {
        const errorMsg = 'كلمة المرور طويلة جداً';
        toast.error(errorMsg);
        setFieldErrors({ password: errorMsg });
        setFormErrorMessage(errorMsg);
        setFormErrorCode('PASSWORD_TOO_LONG');
        setIsLoading(false);
        setIsShaking(true);
        return;
      }

      setIsCreatingAccount(true);
      toast.info('جارٍ التحقق من الحساب وإنشاءه إذا لزم الأمر...', {
        duration: 2500,
      });

      // Prepare request with validated data
      const loginRequest = {
        email: normalizedEmail,
        password: formData.password, // Don't trim password
        rememberMe: Boolean(formData.rememberMe),
        deviceFingerprint: deviceFingerprint || undefined,
        captchaToken: (requiresCaptcha && captchaToken && typeof captchaToken === 'string' && captchaToken.trim().length > 0) 
          ? captchaToken.trim() 
          : undefined,
      };

      let data;
      try {
        // Add timeout protection
        const loginPromise = loginUser(loginRequest);
        const timeoutPromise = new Promise<LoginResponse>((resolve, reject) => {
          setTimeout(() => reject({ 
            error: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.', 
            code: 'REQUEST_TIMEOUT' 
          }), 30000); // 30 second timeout
        });

        data = await Promise.race([loginPromise, timeoutPromise]);
        setIsCreatingAccount(false);
      } catch (apiError: unknown) {
        setIsCreatingAccount(false);
        throw apiError;
      }

      if (!data || typeof data !== 'object') {
        if (process.env.NODE_ENV === 'development') {
          logger.error('Invalid login response structure:', data);
        }
        toast.error('استجابة غير صحيحة من الخادم. يرجى المحاولة مرة أخرى.');
        setIsLoading(false);
        return;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        if (!data.loginAttemptId) {
          logger.error('2FA required but missing loginAttemptId');
          toast.error('خطأ في استجابة التحقق بخطوتين. يرجى المحاولة مرة أخرى.');
          setIsLoading(false);
          return;
        }

        setShowTwoFactor(true);
        setLoginAttemptId(data.loginAttemptId);
        setIsLoading(false);
        resetErrors();
        toast.info('يرجى إدخال رمز التحقق المرسل إلى بريدك الإلكتروني', {
          duration: 5000,
        });
        return;
      }

      // Check risk level
      if (data.riskAssessment) {
        setRiskLevel(data.riskAssessment.level);

        if (
          data.riskAssessment.level === 'high' ||
          data.riskAssessment.level === 'critical'
        ) {
          toast.warning('تم اكتشاف نشاط غير معتاد. يرجى التحقق من هويتك.', {
            duration: 6000,
          });
        } else if (data.riskAssessment.level === 'medium') {
          toast.info('تم اكتشاف جهاز جديد. يرجى التأكد من هويتك.', {
            duration: 4000,
          });
        }
      }

      if (!data.token || !data.user) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('Invalid login response:', data);
        }
        toast.error('استجابة غير صحيحة من الخادم. يرجى المحاولة مرة أخرى.');
        setIsLoading(false);
        return;
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? undefined,
        role: data.user.role ?? 'user',
        emailVerified: data.user.emailVerified ?? false,
        twoFactorEnabled: data.user.twoFactorEnabled ?? false,
        lastLogin: typeof data.user.lastLogin === 'string' ? data.user.lastLogin : 
                   (data.user.lastLogin && typeof data.user.lastLogin === 'object' && 'toISOString' in data.user.lastLogin
                     ? (data.user.lastLogin as Date).toISOString() 
                     : data.user.lastLogin ? String(data.user.lastLogin) : undefined),
      };
      await handleLoginSuccess({ ...data, user: userData });
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Login error:', error);
      }
      handleLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle two-factor authentication submission
   */
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!twoFactorCode || !validateTwoFactorCode(twoFactorCode)) {
      const invalidCodeMessage = 'يرجى إدخال رمز صحيح مكون من 6 أرقام';
      toast.error(invalidCodeMessage);
      setFormErrorMessage(invalidCodeMessage);
      setFormErrorCode('INVALID_TWO_FACTOR_CODE');
      setIsShaking(true);
      return;
    }

    resetErrors();
    setIsLoading(true);

    try {
      const data = await verifyTwoFactor({
        loginAttemptId,
        code: twoFactorCode,
      });

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? undefined,
        role: data.user.role ?? 'user',
        emailVerified: data.user.emailVerified ?? false,
        twoFactorEnabled: data.user.twoFactorEnabled ?? false,
        lastLogin: typeof data.user.lastLogin === 'string' ? data.user.lastLogin : 
                   (data.user.lastLogin && typeof data.user.lastLogin === 'object' && 'toISOString' in data.user.lastLogin
                     ? (data.user.lastLogin as Date).toISOString() 
                     : data.user.lastLogin ? String(data.user.lastLogin) : undefined),
      };
      await handleLoginSuccess({ ...data, user: userData });
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('2FA verification error:', error);
      }

      const errorMessage =
        (error as any)?.error ||
        (error as any)?.message ||
        'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.';
      const errorCode = (error as any)?.code || 'TWO_FACTOR_UNEXPECTED_ERROR';

      toast.error(errorMessage);
      setFormErrorMessage(errorMessage || null);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
      setTwoFactorCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Form state
    formData,
    showPassword,
    isLoading,
    showTwoFactor,
    twoFactorCode,
    
    // Error state
    formErrorMessage,
    formErrorCode,
    fieldErrors,
    isShaking,
    
    // Security state
    deviceFingerprint,
    riskLevel,
    requiresCaptcha,
    captchaToken,
    failedAttempts,
    lockoutSeconds,
    isFormLocked,
    
    // UI state
    focusedField,
    isCreatingAccount,
    isGoogleOAuthEnabled,
    
    // Refs
    emailInputRef,
    passwordInputRef,
    
    // Actions
    setShowPassword,
    setTwoFactorCode,
    setCaptchaToken,
    setFocusedField,
    setShowTwoFactor,
    setFormErrorMessage,
    setFormErrorCode,
    handleInputChange,
    handleSubmit,
    handleTwoFactorSubmit,
    resetErrors,
    
    // Utilities
    formControls,
    setIsShaking,
    setDeviceFingerprint,
    setIsGoogleOAuthEnabled,
    setLockoutSeconds,
  };
};

