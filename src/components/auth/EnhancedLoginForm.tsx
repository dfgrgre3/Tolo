'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Fingerprint,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Chrome,
  Smartphone,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientDeviceFingerprint } from '@/lib/security/device-fingerprint';
import { CaptchaWidget } from './CaptchaWidget';
import { LAST_VISITED_PATH_KEY } from '@/app/ClientLayoutProvider';
import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';
import type { LoginErrorResponse } from '@/types/api/auth';
import { safeGetItem, safeRemoveItem, safeWindow, isBrowser } from '@/lib/safe-client-utils';

import { logger } from '@/lib/logger';

const formVariants = {
  initial: { opacity: 0, y: 20, x: 0 },
  steady: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  shake: {
    opacity: 1,
    y: 0,
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
} as const;

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function EnhancedLoginForm() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const formControls = useAnimation();
  const [isShaking, setIsShaking] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formErrorCode, setFormErrorCode] = useState<string | null>(null);
  const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState<boolean>(true); // Default to true to avoid flash
  
  // Check OAuth provider status
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/oauth/status');
        if (response.ok) {
          const data = await response.json();
          setIsGoogleOAuthEnabled(data.providers?.google?.enabled ?? false);
        }
      } catch (error) {
        logger.error('Failed to check OAuth status:', error);
        // If check fails, default to false for safety
        setIsGoogleOAuthEnabled(false);
      }
    };
    
    checkOAuthStatus();
  }, []);
  
  // Check for OAuth errors in URL parameters
  useEffect(() => {
    if (isBrowser()) {
      safeWindow((w) => {
        const urlParams = new URLSearchParams(w.location.search);
        const error = urlParams.get('error');
        const message = urlParams.get('message');
        
        if (error) {
          const errorMessage = message 
            ? decodeURIComponent(message) 
            : 'حدث خطأ أثناء تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.';
          
          setFormErrorMessage(errorMessage || null);
          setFormErrorCode(error);
          setIsShaking(true);
          toast.error(errorMessage, { duration: 5000 });
          
          // Clean up URL parameters
          const newUrl = w.location.pathname;
          w.history.replaceState({}, '', newUrl);
        }
      }, undefined);
    }
  }, []);
  
  // Get redirect parameter from URL
  // Priority: 1. URL redirect parameter, 2. Stored path, 3. Home page
  const getRedirectPath = () => {
    // Helper to validate and sanitize redirect paths
    const isValidRedirectPath = (path: string): boolean => {
      if (!path || typeof path !== 'string') return false;
      
      // Must be a relative path (starts with /)
      if (!path.startsWith('/')) return false;
      
      // Must not be an external URL (no //)
      if (path.startsWith('//')) return false;
      
      // Must not be auth pages (to prevent redirect loops)
      if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/auth/')) {
        return false;
      }
      
      // Must not contain dangerous characters or patterns
      if (path.includes('<') || path.includes('>') || path.includes('javascript:') || path.includes('data:')) {
        return false;
      }
      
      return true;
    };

    // 1. Check URL redirect parameter (highest priority)
    const redirectFromUrl = safeWindow((w) => {
      const urlParams = new URLSearchParams(w.location.search);
      const redirectParam = urlParams.get('redirect');
      if (redirectParam) {
        try {
          const decoded = decodeURIComponent(redirectParam);
          // Extract path only (remove query params for validation, then add them back)
          const [pathOnly, queryParams] = decoded.split('?');
          if (isValidRedirectPath(pathOnly)) {
            return queryParams ? `${pathOnly}?${queryParams}` : pathOnly;
          }
        } catch (e) {
          logger.error('Failed to decode redirect parameter:', e);
        }
      }
      return null;
    }, null);

    if (redirectFromUrl) return redirectFromUrl;

    // 2. Check stored redirect path (from AuthGuard or previous navigation)
    try {
      const storedRedirect =
        safeGetItem(LAST_VISITED_PATH_KEY, { storageType: 'session', fallback: null }) ??
        safeGetItem(LAST_VISITED_PATH_KEY, { storageType: 'local', fallback: null });

      if (storedRedirect && isValidRedirectPath(storedRedirect)) {
        return storedRedirect;
      }
    } catch (storageError) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Unable to read stored redirect path:', storageError);
      }
    }
    
    // 3. Default to home page
    return '/';
  };

  const clearStoredRedirect = () => {
    // Use safe wrappers that handle window undefined and errors automatically
    safeRemoveItem(LAST_VISITED_PATH_KEY, { storageType: 'session' });
    safeRemoveItem(LAST_VISITED_PATH_KEY, { storageType: 'local' });
  };
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  useEffect(() => {
    formControls.start('steady');
  }, [formControls, showTwoFactor]);

  useEffect(() => {
    if (!isShaking) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await formControls.start('shake');
      } finally {
        if (!cancelled) {
          setIsShaking(false);
          formControls.start('steady');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isShaking, formControls]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginAttemptId, setLoginAttemptId] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<any>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const isFormLocked = lockoutSeconds !== null && lockoutSeconds > 0;

  const formatLockoutTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get device fingerprint on mount
  useEffect(() => {
    getClientDeviceFingerprint()
      .then(setDeviceFingerprint)
      .catch((error) => logger.error('Failed to get device fingerprint', error));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Submit on Enter (when not in textarea)
      if (e.key === 'Enter' && !isLoading && e.target instanceof HTMLInputElement) {
        const form = e.target.closest('form');
        if (form && !showTwoFactor) {
          form.requestSubmit();
        }
      }
      // Focus email on Alt+E
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        emailInputRef.current?.focus();
      }
      // Focus password on Alt+P
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        passwordInputRef.current?.focus();
      }
    };

    if (isBrowser()) {
      safeWindow((w) => {
        w.addEventListener('keydown', handleKeyPress);
      }, undefined);
      return () => {
        safeWindow((w) => {
          w.removeEventListener('keydown', handleKeyPress);
        }, undefined);
      };
    }
  }, [isLoading, showTwoFactor]);

  useEffect(() => {
    if (!isFormLocked) {
      return;
    }

    const intervalId = safeWindow((w) => w.setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null) return prev;
        return prev <= 1 ? 0 : prev - 1;
      });
    }, 1000), null);

    if (!intervalId) return;

    return () => {
      safeWindow((w) => {
        w.clearInterval(intervalId);
      }, undefined);
    };
  }, [isFormLocked]);

  useEffect(() => {
    if (lockoutSeconds === 0) {
      setLockoutSeconds(null);
      setFormErrorMessage(null);
      setFormErrorCode(null);
      toast.info('يمكنك المحاولة الآن.');
    }
  }, [lockoutSeconds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * Validate form data before submission
   * Improved validation with better error messages
   */
  const validateForm = (): { isValid: boolean; errors: { email?: string; password?: string } } => {
    const errors: { email?: string; password?: string } = {};
    
    // Email validation
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (trimmedEmail.length > 255) {
      errors.email = 'البريد الإلكتروني طويل جداً (الحد الأقصى 255 حرف)';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'البريد الإلكتروني غير صالح. يرجى التحقق من التنسيق';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      errors.password = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
    } else if (formData.password.length > 128) {
      errors.password = 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)';
    }
    
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  /**
   * Reset all form errors
   */
  const resetErrors = () => {
    setFieldErrors({});
    setFormErrorMessage(null);
    setFormErrorCode(null);
  };

  /**
   * Handle successful login
   * Improved with better validation and error handling
   */
  interface LoginResponse {
    token: string;
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
  }

  const handleLoginSuccess = async (data: LoginResponse) => {
    // Reset CAPTCHA state on successful login
    setRequiresCaptcha(false);
    setCaptchaToken(null);
    setFailedAttempts(0);
    resetErrors();

    // Validate response data
    if (!data || !data.token || !data.user) {
      logger.error('Invalid login response data:', data);
      toast.error('استجابة تسجيل الدخول غير صحيحة');
      setIsLoading(false);
      return;
    }

    // Validate token format
    const tokenParts = data.token.split('.');
    if (tokenParts.length !== 3) {
      logger.error('Invalid token format received');
      toast.error('رمز المصادقة المستلم غير صحيح');
      setIsLoading(false);
      return;
    }

    // Validate user data
    if (!data.user.id || !data.user.email) {
      logger.error('Invalid user data in response:', data.user);
      toast.error('بيانات المستخدم غير صحيحة');
      setIsLoading(false);
      return;
    }

    // Prepare user data to match User interface
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || undefined,
      role: data.user.role || 'user',
      emailVerified: data.user.emailVerified || false,
      twoFactorEnabled: data.user.twoFactorEnabled || false,
      lastLogin: data.user.lastLogin 
        ? (typeof data.user.lastLogin === 'string' ? data.user.lastLogin : data.user.lastLogin.toISOString())
        : undefined,
      provider: 'local' as const,
    };

    // Save user data (token is already in httpOnly cookie from server)
    try {
      login(data.token, userData);
      
      // Note: Token is stored in httpOnly cookie by server (setAuthCookies)
      // No need to save token to localStorage for security
      
      // Show success message - different message if account was just created
      if (data.accountWasCreated) {
        toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح! مرحباً بك!', { duration: 4000 });
      } else {
        toast.success('تم تسجيل الدخول بنجاح!', { duration: 3000 });
      }
      
      // Refresh user data from server to ensure we have the latest information
      // Do this in parallel with navigation to avoid blocking
      refreshUser().catch((refreshError) => {
        // Non-critical error - user data was already set from login response
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Failed to refresh user data:', refreshError);
        }
      });
      
      resetErrors();
      
      // Reset loading state immediately
      setIsLoading(false);
      
      // Get redirect path - prioritize URL parameter, then stored path, then home
      const redirectPath = getRedirectPath();
      clearStoredRedirect();

      // Redirect after successful login
      // Use replace instead of push to prevent back navigation to login
      // Small delay to ensure state is updated and cookies are set by server
      setTimeout(() => {
        router.replace(redirectPath);
        router.refresh();
      }, 500);
    } catch (loginError) {
      // If login function fails, show error and reset loading
      logger.error('Error in login function:', loginError);
      toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
      setIsLoading(false);
      
      // Reset form state on error
      setRequiresCaptcha(false);
      setCaptchaToken(null);
      resetErrors();
    }
  };

  /**
   * Handle login errors
   * Ensures all errors are properly formatted and never empty
   */
  interface ApiError {
    error?: string;
    message?: string;
    code?: string;
    status?: number;
  }

  const handleLoginError = (error: unknown) => {
    // Helper to safely check if object is empty
    const isEmpty = (obj: unknown): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      try {
        return Object.keys(obj).length === 0;
      } catch {
        return false;
      }
    };
    
    // Normalize error object - handle empty objects and various error formats
    let apiError: LoginErrorResponse;
    
    // Check if error is empty or invalid
    if (!error || isEmpty(error)) {
      // Empty error object - create a default error
      apiError = {
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (error instanceof Error) {
      // Native Error object
      apiError = {
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (typeof error === 'string') {
      // String error
      apiError = {
        error: error || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
      };
    } else if (error && typeof error === 'object') {
      // Object error - extract error message and code
      const errorMessage = error.error || error.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      const errorCode = error.code || 'UNEXPECTED_ERROR';
      
      // Build error object with all properties
      apiError = {
        error: errorMessage,
        code: errorCode,
        ...(error.status !== undefined && { status: error.status }),
        ...(error.retryAfterSeconds !== undefined && { retryAfterSeconds: error.retryAfterSeconds }),
        ...(error.requiresCaptcha !== undefined && { requiresCaptcha: error.requiresCaptcha }),
        ...(error.failedAttempts !== undefined && { failedAttempts: error.failedAttempts }),
      };
    } else {
      // Unknown error format - try to extract message
      const errorMessage = error?.message || error?.error || String(error) || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      apiError = {
        error: errorMessage,
        code: error?.code || 'UNEXPECTED_ERROR',
      };
    }
    
    // Final safety check - ensure error message and code are never empty
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
      
      // Require CAPTCHA after 3 failed attempts
      if (newAttempts >= 3) {
        setRequiresCaptcha(true);
      }

      // Set field errors based on error message
      const errors: { email?: string; password?: string } = {};
      if (errorMessage.includes('بريد') || errorMessage.toLowerCase().includes('email')) {
        errors.email = errorMessage;
      } else if (errorMessage.includes('مرور') || errorMessage.toLowerCase().includes('password')) {
        errors.password = errorMessage;
      } else {
        // Generic error - show on password field
        errors.password = errorMessage;
      }
      
      setFieldErrors(errors);
      toast.error(errorMessage);
      setFormErrorMessage(errorMessage || null);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
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
    const validation = validateForm();
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const validationMessage = 'يرجى إدخال جميع الحقول بشكل صحيح';
      toast.error(validationMessage);
      setFormErrorMessage(validationMessage);
      setFormErrorCode('VALIDATION_ERROR');
      setIsShaking(true);
      return;
    }

    setIsLoading(true);
    setIsCreatingAccount(false); // Reset account creation state

    try {
      // Normalize email input
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // Show account creation message if user doesn't exist (will be handled by backend)
      // The backend will auto-create the account if it doesn't exist
      setIsCreatingAccount(true);
      toast.info('جارٍ التحقق من الحساب وإنشاءه إذا لزم الأمر...', { duration: 2500 });
      
      // Use the centralized API client with improved error handling
      let data;
      try {
        data = await loginUser({
          email: normalizedEmail,
          password: formData.password,
          rememberMe: formData.rememberMe,
          deviceFingerprint,
          captchaToken: requiresCaptcha && captchaToken ? captchaToken : undefined,
        });
        
        // If we get here, account exists or was created successfully
        setIsCreatingAccount(false);
      } catch (apiError: unknown) {
        setIsCreatingAccount(false);
        
        // Check if error is about invalid credentials (user might not exist)
        // The backend will auto-create, but if it fails, show error
        if (apiError?.code === 'INVALID_CREDENTIALS' || apiError?.code === 'USER_NOT_FOUND') {
          // Backend will auto-create, but if it fails, we'll show error
          // Continue to throw to show error
        }
        
        // The API client already handles most errors, but we catch here to ensure proper state management
        throw apiError;
      }

      // Validate response structure
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
        // Validate 2FA response structure
        if (!data.loginAttemptId) {
          logger.error('2FA required but missing loginAttemptId');
          toast.error('خطأ في استجابة التحقق بخطوتين. يرجى المحاولة مرة أخرى.');
          setIsLoading(false);
          return;
        }
        
        setShowTwoFactor(true);
        setLoginAttemptId(data.loginAttemptId);
        setIsLoading(false);
        resetErrors(); // Clear any previous errors
        toast.info('يرجى إدخال رمز التحقق المرسل إلى بريدك الإلكتروني', { duration: 5000 });
        return;
      }

      // Check risk level
      if (data.riskAssessment) {
        setRiskLevel(data.riskAssessment.level);
        
        if (data.riskAssessment.level === 'high' || data.riskAssessment.level === 'critical') {
          toast.warning('تم اكتشاف نشاط غير معتاد. يرجى التحقق من هويتك.', { duration: 6000 });
        } else if (data.riskAssessment.level === 'medium') {
          toast.info('تم اكتشاف جهاز جديد. يرجى التأكد من هويتك.', { duration: 4000 });
        }
      }

      // Successful login - verify data exists
      if (!data.token || !data.user) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('Invalid login response:', data);
        }
        toast.error('استجابة غير صحيحة من الخادم. يرجى المحاولة مرة أخرى.');
        setIsLoading(false);
        return;
      }

      // Handle successful login
      await handleLoginSuccess(data);

    } catch (error: unknown) {
      // First, normalize the error to ensure it has proper structure
      // This prevents empty objects from being logged
      let normalizedError: LoginErrorResponse;
      
      // Helper function to safely get object keys
      const getObjectKeys = (obj: unknown): string[] => {
        try {
          if (obj && typeof obj === 'object') {
            return Object.keys(obj);
          }
          return [];
        } catch {
          return [];
        }
      };
      
      // Check if error is empty object or invalid
      const errorKeys = getObjectKeys(error);
      const isEmptyObject = error && typeof error === 'object' && errorKeys.length === 0;
      
      if (!error || isEmptyObject) {
        // Empty error object - create a proper error structure
        normalizedError = {
          error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
          code: 'UNEXPECTED_ERROR',
        };
      } else if (error instanceof Error) {
        // Native Error object - convert to our format
        normalizedError = {
          error: error.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
          code: 'UNEXPECTED_ERROR',
        };
      } else if (typeof error === 'string') {
        // String error - convert to our format
        normalizedError = {
          error: error || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
          code: 'UNEXPECTED_ERROR',
        };
      } else if (error && typeof error === 'object') {
        // Object error - ensure it has required properties
        const errorMessage = error.error || error.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
        const errorCode = error.code || 'UNEXPECTED_ERROR';
        
        normalizedError = {
          error: errorMessage,
          code: errorCode,
          ...(error.status !== undefined && { status: error.status }),
          ...(error.retryAfterSeconds !== undefined && { retryAfterSeconds: error.retryAfterSeconds }),
          ...(error.requiresCaptcha !== undefined && { requiresCaptcha: error.requiresCaptcha }),
          ...(error.failedAttempts !== undefined && { failedAttempts: error.failedAttempts }),
        };
      } else {
        // Unknown error type - create default
        normalizedError = {
          error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
          code: 'UNEXPECTED_ERROR',
        };
      }
      
      // Final safety check - ensure normalizedError always has error and code
      // Check multiple ways to ensure it's not empty
      const hasErrorProperty = normalizedError && typeof normalizedError === 'object' && 'error' in normalizedError;
      const hasCodeProperty = normalizedError && typeof normalizedError === 'object' && 'code' in normalizedError;
      const errorValue = hasErrorProperty ? (normalizedError as any).error : null;
      const codeValue = hasCodeProperty ? (normalizedError as any).code : null;
      
      if (!normalizedError || !hasErrorProperty || !hasCodeProperty || !errorValue || !codeValue) {
        // Force create a proper error object
        normalizedError = {
          error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
          code: 'UNEXPECTED_ERROR',
        };
      }
      
      // Enhanced error logging in development mode only
      if (process.env.NODE_ENV === 'development') {
        try {
          // Log the normalized error directly, as it's already structured
          if (normalizedError && normalizedError.error && normalizedError.code) {
            logger.error('Login error:', { ...normalizedError, timestamp: new Date().toISOString() });
          } else {
            // Fallback for unexpected cases where normalization fails
            logger.error('Login error (fallback):', {
              timestamp: new Date().toISOString(),
              error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول',
              code: 'UNEXPECTED_ERROR',
              originalError: error, // Log original error for inspection
            });
          }
        } catch (logError) {
          // If logging itself fails, provide a minimal, safe log
          logger.error('Login error (logging failed):', {
            timestamp: new Date().toISOString(),
            error: 'حدث خطأ أثناء تسجيل الدخول',
            code: 'LOG_ERROR',
            originalErrorType: typeof error,
          });
        }
      }
      
      // Handle login errors with normalized error
      handleLoginError(normalizedError);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate two-factor code
   */
  const validateTwoFactorCode = (code: string): boolean => {
    return code.length === 6 && /^\d{6}$/.test(code);
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate 2FA code
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
      // Use the centralized API client
      const data = await verifyTwoFactor({
        loginAttemptId,
        code: twoFactorCode,
      });

      // Successful 2FA verification - use the same success handler
      await handleLoginSuccess(data);

    } catch (error: unknown) {
      // Normalize error first to ensure it has proper structure
      let normalizedError: LoginErrorResponse;
      
      // Type guard to check if error is LoginErrorResponse
      const isLoginErrorResponse = (err: unknown): err is LoginErrorResponse => {
        return (
          typeof err === 'object' &&
          err !== null &&
          ('error' in err || 'code' in err)
        );
      };
      
      if (isLoginErrorResponse(error)) {
        normalizedError = error;
      } else if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
        normalizedError = {
          error: 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
          code: 'TWO_FACTOR_UNEXPECTED_ERROR',
        };
      } else if (error instanceof Error) {
        normalizedError = {
          error: error.message || 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
          code: 'TWO_FACTOR_UNEXPECTED_ERROR',
        };
      } else if (typeof error === 'string') {
        normalizedError = {
          error: error || 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
          code: 'TWO_FACTOR_UNEXPECTED_ERROR',
        };
      } else if (error && typeof error === 'object') {
        normalizedError = {
          error: error.error || error.message || 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
          code: error.code || 'TWO_FACTOR_UNEXPECTED_ERROR',
        };
      } else {
        normalizedError = {
          error: 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
          code: 'TWO_FACTOR_UNEXPECTED_ERROR',
        };
      }
      
      // Enhanced error logging in development mode only
      if (process.env.NODE_ENV === 'development') {
        logger.error('2FA verification error:', {
          timestamp: new Date().toISOString(),
          error: normalizedError.error,
          code: normalizedError.code,
        });
      }
      
      // Use normalized error
      const errorMessage = normalizedError.error || 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.';
      const errorCode = normalizedError.code || 'TWO_FACTOR_UNEXPECTED_ERROR';
      
      toast.error(errorMessage);
      setFormErrorMessage(errorMessage || null);
      setFormErrorCode(errorCode || null);
      setIsShaking(true);
      setTwoFactorCode(''); // Clear the code on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const hasPublicKeyCredential = safeWindow((w) => !!w.PublicKeyCredential, false);
    if (!hasPublicKeyCredential) {
      toast.error('المصادقة البيومترية غير مدعومة في هذا المتصفح');
      return;
    }

    setIsLoading(true);

    try {
      // Create an AbortController for timeout
      const challengeController = new AbortController();
      const challengeTimeout = setTimeout(() => challengeController.abort(), 30000);

      let challengeResponse: Response;
      let challenge: string;

      try {
        challengeResponse = await fetch('/api/auth/biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'authenticate' }),
          signal: challengeController.signal,
        });

        const contentType = challengeResponse.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!challengeResponse.ok) {
          if (isJson) {
            try {
              const errorData = await challengeResponse.json();
              throw new Error(errorData.error || `خطأ في الاتصال: ${challengeResponse.status}`);
            } catch (jsonError) {
              throw new Error(`خطأ في الاتصال: ${challengeResponse.status} ${challengeResponse.statusText}`);
            }
          } else {
            const status = challengeResponse.status;
            throw new Error(
              status === 404
                ? 'المصادقة البيومترية غير متاحة حالياً.'
                : status >= 500
                ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
                : `خطأ في الخادم (${status})`
            );
          }
        }

        if (!isJson) {
          const status = challengeResponse.status;
          throw new Error(
            status >= 500
              ? 'الخادم يواجه مشكلة تقنية.'
              : 'استجابة غير صحيحة من الخادم.'
          );
        }

        try {
          const challengeData = await challengeResponse.json();
          challenge = challengeData.challenge;
        } catch (jsonError) {
          if (process.env.NODE_ENV === 'development') {
            logger.error('JSON parsing error:', jsonError);
          }
          throw new Error('فشل في معالجة استجابة الخادم.');
        }
        clearTimeout(challengeTimeout);
      } catch (fetchError: unknown) {
        clearTimeout(challengeTimeout);
        
        const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        if (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        toast.error(error.message || 'فشلت المصادقة البيومترية', { duration: 5000 });
        setIsLoading(false);
        return;
      }

      // Request credential
      let credential: PublicKeyCredential | null = null;
      try {
        credential = await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
            timeout: 60000,
            userVerification: 'required',
          },
        });

        if (!credential) {
          toast.error('فشلت المصادقة البيومترية');
          setIsLoading(false);
          return;
        }
      } catch (credError: unknown) {
        const error = credError instanceof Error ? credError : new Error(String(credError));
        if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
          toast.error('تم إلغاء المصادقة البيومترية أو غير مدعومة');
        } else {
          toast.error('فشلت المصادقة البيومترية');
        }
        setIsLoading(false);
        return;
      }

      // Verify credential
      const verifyController = new AbortController();
      const verifyTimeout = setTimeout(() => verifyController.abort(), 30000);

      try {
        const verifyResponse = await fetch('/api/auth/biometric/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential,
            challenge,
          }),
          signal: verifyController.signal,
        });

        const contentType = verifyResponse.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!verifyResponse.ok) {
          if (isJson) {
            try {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || `خطأ في الاتصال: ${verifyResponse.status}`);
            } catch (jsonError) {
              throw new Error(`خطأ في الاتصال: ${verifyResponse.status} ${verifyResponse.statusText}`);
            }
          } else {
            const status = verifyResponse.status;
            throw new Error(
              status === 404
                ? 'المصادقة البيومترية غير متاحة حالياً.'
                : status >= 500
                ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
                : `خطأ في الخادم (${status})`
            );
          }
        }

        if (!isJson) {
          const status = verifyResponse.status;
          throw new Error(
            status >= 500
              ? 'الخادم يواجه مشكلة تقنية.'
              : 'استجابة غير صحيحة من الخادم.'
          );
        }

        let data: any;
        try {
          data = await verifyResponse.json();
        } catch (jsonError) {
          if (process.env.NODE_ENV === 'development') {
            logger.error('JSON parsing error:', jsonError);
          }
          throw new Error('فشل في معالجة استجابة الخادم.');
        }
        
        clearTimeout(verifyTimeout);

        try {
          // Token is already in httpOnly cookie from server
          // Just save user data to localStorage for faster initial render
          login(data.token, data.user);
          toast.success('تم تسجيل الدخول بنجاح!');
          setIsLoading(false);
          
          // Get redirect path - prioritize URL parameter, then stored path, then home
          const redirectPath = getRedirectPath();
          clearStoredRedirect();

          // Redirect after successful login
          setTimeout(() => {
            router.replace(redirectPath);
          }, 500);
        } catch (loginError) {
          // If login function fails, show error and reset loading
          logger.error('Error in login function:', loginError);
          toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
          setIsLoading(false);
        }
      } catch (verifyError: unknown) {
        clearTimeout(verifyTimeout);
        
        const error = verifyError instanceof Error ? verifyError : new Error(String(verifyError));
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        if (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        toast.error(error.message || 'فشلت المصادقة');
        setIsLoading(false);
        return;
      }

    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Biometric login error:', error);
      }
      
      const err = error instanceof Error ? error : new Error(String(error));
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.name === 'TypeError' ||
        !navigator.onLine
      ) {
        toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
      } else {
        toast.error(err.message || 'فشلت المصادقة البيومترية');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showTwoFactor) {
    return (
      <motion.div
        variants={formVariants}
        initial="initial"
        animate={formControls}
        className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20"
          >
            <ShieldCheck className="h-8 w-8 text-indigo-300" aria-hidden="true" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white">التحقق بخطوتين</h2>
        <p className="mt-2 text-sm text-slate-300">
          أدخل الرمز المرسل إلى بريدك الإلكتروني
        </p>
      </motion.div>

      <AnimatePresence>
        {formErrorMessage && (
          <motion.div
            key="twofactor-error-banner"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-100"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">حدث خطأ أثناء التحقق</p>
            <p className="mt-1">{formErrorMessage}</p>
            {formErrorCode && (
              <p className="mt-2 text-xs text-red-200">
                رمز الخطأ:{' '}
                <span className="font-mono tracking-wide text-red-100">{formErrorCode}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl bg-white/10 px-6 py-4 text-center text-2xl tracking-widest text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              maxLength={6}
              autoFocus
              aria-label="رمز التحقق بخطوتين"
              aria-required="true"
              aria-describedby="two-factor-help"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              id="two-factor-help"
              className="mt-2 text-xs text-center text-slate-400"
            >
              أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني
            </motion.p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || twoFactorCode.length !== 6}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="تحقق من الرمز"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                جارٍ التحقق...
              </span>
            ) : (
              'تحقق'
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
          onClick={() => {
            setShowTwoFactor(false);
            setFormErrorMessage(null);
            setFormErrorCode(null);
          }}
            className="w-full text-sm text-slate-300 hover:text-white transition"
            aria-label="العودة إلى نموذج تسجيل الدخول"
          >
            العودة لتسجيل الدخول
          </motion.button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={formVariants}
      initial="initial"
      animate={formControls}
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      role="form"
      aria-label="نموذج تسجيل الدخول"
    >
      <AnimatePresence>
        {riskLevel && (riskLevel === 'high' || riskLevel === 'medium') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 rounded-xl bg-yellow-500/20 border border-yellow-500/30 p-4 flex items-start gap-3"
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle className="h-5 w-5 text-yellow-300 mt-0.5" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-200">تنبيه أمني</p>
              <p className="text-yellow-100">
                تم اكتشاف نشاط غير معتاد. تأكد من أنك تستخدم جهازك الشخصي.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-center"
      >
        <h2 className="text-2xl font-bold text-white">مرحباً بعودتك</h2>
        <p className="mt-2 text-sm text-slate-300">
          سجّل دخولك للوصول إلى حسابك
        </p>
      </motion.div>

      <AnimatePresence>
        {formErrorMessage && (
          <motion.div
            key="login-error-banner"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-100"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">حدث خطأ أثناء تسجيل الدخول</p>
            <p className="mt-1">{formErrorMessage}</p>
            {formErrorCode && (
              <p className="mt-2 text-xs text-red-200">
                رمز الخطأ:{' '}
                <span className="font-mono tracking-wide text-red-100">{formErrorCode}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail
              className={cn(
                'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
                focusedField === 'email' ? 'text-indigo-400' : 'text-slate-400'
              )}
              aria-hidden="true"
            />
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="your@email.com"
              className={cn(
                'w-full rounded-xl bg-white/10 py-3 pr-12 pl-4 text-white placeholder-slate-400 transition-all duration-200',
                'focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400',
                focusedField === 'email' && 'ring-2 ring-indigo-400'
              )}
              dir="ltr"
              required
              aria-required="true"
              aria-label="البريد الإلكتروني"
              {...(fieldErrors.email
                ? { 'aria-invalid': true as const, 'aria-describedby': 'email-error' }
                : {})}
              autoComplete="email"
              disabled={isLoading || isFormLocked}
            />
          </div>
          <AnimatePresence>
            {fieldErrors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="email-error"
                className="mt-1 text-xs text-red-300"
                role="alert"
                aria-live="polite"
              >
                {fieldErrors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            كلمة المرور
          </label>
          <div className="relative">
            <Lock
              className={cn(
                'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
                focusedField === 'password' ? 'text-indigo-400' : 'text-slate-400'
              )}
              aria-hidden="true"
            />
            <input
              ref={passwordInputRef}
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              className={cn(
                'w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 transition-all duration-200',
                'focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400',
                focusedField === 'password' && 'ring-2 ring-indigo-400'
              )}
              dir="ltr"
              required
              aria-required="true"
              aria-label="كلمة المرور"
              {...(fieldErrors.password
                ? { 'aria-invalid': true as const, 'aria-describedby': 'password-error' }
                : {})}
              autoComplete="current-password"
              disabled={isLoading || isFormLocked}
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </motion.button>
          </div>
          <AnimatePresence>
            {fieldErrors.password && (
              <motion.p
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="password-error"
                className="mt-1 text-xs text-red-300"
                role="alert"
                aria-live="polite"
              >
                {fieldErrors.password}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="rememberMe" className="flex items-center gap-2 text-slate-200 cursor-pointer">
            <input
              id="rememberMe"
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-slate-400 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-400"
              aria-label="تذكرني"
            />
            تذكرني
          </label>
          <a
            href="/forgot-password"
            className="text-indigo-300 hover:text-indigo-200 transition"
          >
            نسيت كلمة المرور؟
          </a>
        </div>

        {/* CAPTCHA Widget */}
        <AnimatePresence>
          {requiresCaptcha && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 space-y-3"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm text-yellow-200">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span className="font-semibold">مطلوب التحقق من الأمان</span>
              </div>
              <CaptchaWidget
                siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                provider="hcaptcha"
                onVerify={(token) => {
                  setCaptchaToken(token);
                  toast.success('تم التحقق من CAPTCHA بنجاح');
                }}
                onError={(error) => {
                  toast.error(error);
                }}
                theme="dark"
              />
              <AnimatePresence>
                {captchaToken && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.8, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-sm text-green-300"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>تم التحقق بنجاح</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: isLoading || (requiresCaptcha && !captchaToken) ? 1 : 1.02 }}
          whileTap={{ scale: isLoading || (requiresCaptcha && !captchaToken) ? 1 : 0.98 }}
          type="submit"
          disabled={isLoading || (requiresCaptcha && !captchaToken)}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          aria-label="تسجيل الدخول"
          aria-busy={isLoading}
        >
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white/20"
              />
            )}
          </AnimatePresence>
          <span className="relative flex items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  جارٍ تسجيل الدخول...
                </motion.span>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  تسجيل الدخول
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 flex items-center">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="w-full border-t border-slate-600"
            />
          </div>
          <div className="relative flex justify-center text-sm">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
              className="bg-slate-900 px-4 text-slate-400"
            >
              أو
            </motion.span>
          </div>
        </motion.div>

        {/* Alternative Login Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid gap-3"
        >
          {/* Biometric Login */}
          <AnimatePresence>
            {safeWindow((w) => !!w.PublicKeyCredential, false) && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.65 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                aria-label="تسجيل الدخول باستخدام البصمة"
              >
                <Fingerprint className="h-5 w-5" aria-hidden="true" />
                تسجيل الدخول بالبصمة
              </motion.button>
            )}
          </AnimatePresence>

          {/* Google Login - Only show if OAuth is configured */}
          {isGoogleOAuthEnabled && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                // Get redirect path before clearing - preserve user's intended destination
                const redirectPath = getRedirectPath();
                clearStoredRedirect();
                safeWindow((w) => {
                  w.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
                }, undefined);
              }}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
              aria-label="تسجيل الدخول باستخدام حساب جوجل"
            >
              <Chrome className="h-5 w-5" aria-hidden="true" />
              تسجيل الدخول بجوجل
            </motion.button>
          )}

          {/* Test Account Login - Only in development */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS === 'true') && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Use test account credentials
                  setFormData({
                    email: 'test@example.com',
                    password: 'Test123!@#',
                    rememberMe: true,
                  });
                  
                  // Auto-submit the form with test credentials
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  const loginController = new AbortController();
                  const loginTimeout = setTimeout(() => loginController.abort(), 30000);

                  try {
                    const loginResponse = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'Test123!@#',
                        rememberMe: true,
                      }),
                      signal: loginController.signal,
                    });

                    clearTimeout(loginTimeout);

                    if (!loginResponse.ok) {
                      // If login fails, try to create the test account first
                      toast.info('جارٍ إنشاء الحساب التجريبي...', { duration: 2000 });
                      
                      try {
                        await fetch('/api/auth/test-account', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        });
                        
                        // Retry login after creating account
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const retryResponse = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            email: 'test@example.com',
                            password: 'Test123!@#',
                            rememberMe: true,
                          }),
                        });

                        if (retryResponse.ok) {
                          const retryData = await retryResponse.json();
                          if (retryData.token && retryData.user) {
                            // Token is already in httpOnly cookie from server
                            login(retryData.token, retryData.user);
                            toast.success('تم تسجيل الدخول بحساب تجريبي!', { duration: 3000 });
                            const redirectPath = getRedirectPath();
                            clearStoredRedirect();
                            router.push(redirectPath);
                            router.refresh();
                            setIsLoading(false);
                            return;
                          }
                        }
                      } catch (createError) {
                        logger.error('Failed to create test account:', createError);
                      }
                      
                      toast.error('فشل تسجيل الدخول بالحساب التجريبي. يرجى المحاولة يدوياً.');
                      setIsLoading(false);
                      return;
                    }

                    const loginData = await loginResponse.json();

                    if (loginData.token && loginData.user) {
                      // Token is already in httpOnly cookie from server
                      login(loginData.token, loginData.user);
                      toast.success('تم تسجيل الدخول بحساب تجريبي!', { duration: 3000 });
                      const redirectPath = getRedirectPath();
                      clearStoredRedirect();
                      router.push(redirectPath);
                      router.refresh();
                    } else {
                      toast.error('بيانات تسجيل الدخول غير صحيحة');
                    }
                  } catch (fetchError: unknown) {
                    clearTimeout(loginTimeout);
                    const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
                    if (error.name !== 'AbortError') {
                      toast.error('حدث خطأ أثناء تسجيل الدخول');
                    }
                  } finally {
                    setIsLoading(false);
                  }
                } catch (error) {
                  logger.error('Test account login error:', error);
                  toast.error('حدث خطأ أثناء تسجيل الدخول بالحساب التجريبي');
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 rounded-xl bg-blue-500/20 border border-blue-400/30 px-6 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-500/30 disabled:opacity-50"
              aria-label="تسجيل الدخول بحساب تجريبي"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              تسجيل الدخول بحساب تجريبي
            </motion.button>
          )}
        </motion.div>
      </form>

      {/* Device Info */}
      <AnimatePresence>
        {deviceFingerprint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="mt-6 rounded-xl bg-white/5 p-4 text-xs text-slate-400 border border-white/10"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-2 mb-2"
            >
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.95, type: 'spring', stiffness: 200 }}
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </motion.div>
              <span className="font-semibold">معلومات الجهاز</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="space-y-1"
            >
              <p>{deviceFingerprint.browser} على {deviceFingerprint.os}</p>
              <p>الشاشة: {deviceFingerprint.screen}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
