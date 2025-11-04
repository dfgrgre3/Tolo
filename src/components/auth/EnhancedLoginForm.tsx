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
  
  // Get redirect parameter from URL
  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      if (redirectParam) {
        try {
          const decoded = decodeURIComponent(redirectParam);
          // Validate that redirect is a relative path (security measure)
          if (decoded.startsWith('/') && !decoded.startsWith('//')) {
            return decoded;
          }
        } catch (e) {
          console.error('Failed to decode redirect parameter:', e);
        }
      }

      try {
        const storedRedirect =
          sessionStorage.getItem(LAST_VISITED_PATH_KEY) ??
          localStorage.getItem(LAST_VISITED_PATH_KEY);

        if (
          storedRedirect &&
          storedRedirect.startsWith('/') &&
          !storedRedirect.startsWith('//') &&
          !storedRedirect.startsWith('/login') &&
          !storedRedirect.startsWith('/register')
        ) {
          return storedRedirect;
        }
      } catch (storageError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Unable to read stored redirect path:', storageError);
        }
      }
    }
    return '/';
  };

  const clearStoredRedirect = () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.removeItem(LAST_VISITED_PATH_KEY);
    } catch {
      // Ignore sessionStorage errors (e.g., unavailable in private mode)
    }

    try {
      localStorage.removeItem(LAST_VISITED_PATH_KEY);
    } catch {
      // Ignore localStorage errors for the same reason
    }
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
      .catch(console.error);
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

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, showTwoFactor]);

  useEffect(() => {
    if (!isFormLocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null) return prev;
        return prev <= 1 ? 0 : prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset field errors
    setFieldErrors({});
    setFormErrorMessage(null);
    setFormErrorCode(null);

    if (isFormLocked && lockoutSeconds !== null) {
      const waitMessage = `يرجى الانتظار ${formatLockoutTime(lockoutSeconds)} قبل المحاولة مرة أخرى.`;
      toast.warning(waitMessage);
      setFormErrorMessage(waitMessage);
      setFormErrorCode('RATE_LIMITED_ACTIVE');
      setIsShaking(true);
      return;
    }

    if (!formData.email || !formData.password) {
      const errors: { email?: string; password?: string } = {};
      if (!formData.email) {
        errors.email = 'البريد الإلكتروني مطلوب';
      }
      if (!formData.password) {
        errors.password = 'كلمة المرور مطلوبة';
      }
      setFieldErrors(errors);
      const validationMessage = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
      toast.error(validationMessage);
      setFormErrorMessage(validationMessage);
      setFormErrorCode('VALIDATION_ERROR');
      setIsShaking(true);
      return;
    }

    setIsLoading(true);

    try {
      // Use the centralized API client
      const data = await loginUser({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        deviceFingerprint,
        captchaToken: requiresCaptcha && captchaToken ? captchaToken : undefined,
      });

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setShowTwoFactor(true);
        setLoginAttemptId(data.loginAttemptId || '');
        setIsLoading(false);
        toast.info('يرجى إدخال رمز التحقق المرسل إلى بريدك الإلكتروني');
        return;
      }

      // Check risk level
      if (data.riskAssessment) {
        setRiskLevel(data.riskAssessment.level);
        
        if (data.riskAssessment.level === 'high' || data.riskAssessment.level === 'critical') {
          toast.warning('تم اكتشاف نشاط غير معتاد. يرجى التحقق من هويتك.');
        }
      }

      // Successful login - verify data exists
      if (!data.token || !data.user) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Invalid login response:', data);
        }
        toast.error('استجابة غير صحيحة من الخادم. يرجى المحاولة مرة أخرى.');
        setIsLoading(false);
        return;
      }

      // Reset CAPTCHA state on successful login
      setRequiresCaptcha(false);
      setCaptchaToken(null);
      setFailedAttempts(0);
      setFieldErrors({});

      // Log successful login for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('Login successful:', {
          hasToken: !!data.token,
          hasUser: !!data.user,
          userId: data.user?.id,
          userEmail: data.user?.email,
        });
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

      // Save token and user data
      try {
        // Call login function from auth context to save token and user state
        login(data.token, userData);
        
        // Also save refresh token if available (for token refresh functionality)
        if (data.refreshToken && typeof window !== 'undefined') {
          try {
            const storage = formData.rememberMe ? localStorage : sessionStorage;
            storage.setItem('refresh_token', data.refreshToken);
          } catch (storageError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to save refresh token:', storageError);
            }
          }
        }
        
        // Refresh user data from server to ensure we have the latest information
        try {
          await refreshUser();
        } catch (refreshError) {
          // Non-critical error - user data was already set from login response
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to refresh user data:', refreshError);
          }
        }
        
        // Show success message
        toast.success('تم تسجيل الدخول بنجاح!');
        setFormErrorMessage(null);
        setFormErrorCode(null);
        
        // Reset loading state immediately
        setIsLoading(false);
        
        // Get redirect path from URL or default to home
        const redirectPath = getRedirectPath();
        
        clearStoredRedirect();

        // Use replace instead of push to prevent back navigation to login
        // Small delay to ensure state is updated and cookies are set by server
        setTimeout(() => {
          router.replace(redirectPath);
          // Refresh the page to ensure server-side cookies are recognized
          router.refresh();
        }, 500);
      } catch (loginError) {
        // If login function fails, show error and reset loading
        console.error('Error in login function:', loginError);
        toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
        setIsLoading(false);
      }

    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', error);
      }
      
      // Handle API errors with proper typing
      const apiError = error as LoginErrorResponse;
      const errorMessage = apiError.error || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      const errorCode = apiError.code || 'UNEXPECTED_ERROR';

      // Handle rate limiting
      if (errorCode === 'RATE_LIMITED' && apiError.retryAfterSeconds) {
        const safeRetrySeconds = Math.max(1, Math.round(apiError.retryAfterSeconds));
        setLockoutSeconds(safeRetrySeconds);
        const formattedCountdown = formatLockoutTime(safeRetrySeconds);
        const formattedMessage = `${errorMessage} (${formattedCountdown})`;
        toast.error(formattedMessage, { duration: 5000 });
        setFormErrorMessage(formattedMessage);
        setFormErrorCode(errorCode);
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
        setFormErrorCode(errorCode);
        setIsShaking(true);
        setIsLoading(false);
        return;
      }

      // Handle network errors
      if (
        errorCode === 'FETCH_ERROR' ||
        errorCode === 'NETWORK_ERROR' ||
        errorCode === 'REQUEST_TIMEOUT' ||
        !navigator.onLine
      ) {
        toast.error(errorMessage, { duration: 5000 });
        setFormErrorMessage(errorMessage);
        setFormErrorCode(errorCode);
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
        setFormErrorMessage(errorMessage);
        setFormErrorCode(errorCode);
        setIsShaking(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      const invalidCodeMessage = 'يرجى إدخال رمز صحيح مكون من 6 أرقام';
      toast.error(invalidCodeMessage);
      setFormErrorMessage(invalidCodeMessage);
      setFormErrorCode('INVALID_TWO_FACTOR_CODE');
      setIsShaking(true);
      return;
    }

    setFormErrorMessage(null);
    setFormErrorCode(null);
    setIsLoading(true);

    try {
      // Use the centralized API client
      const data = await verifyTwoFactor({
        loginAttemptId,
        code: twoFactorCode,
      });

      // Successful 2FA verification
      try {
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
        };
        login(data.token, userData);
        toast.success('تم التحقق بنجاح!');
        setFormErrorMessage(null);
        setFormErrorCode(null);
        
        // Reset loading state immediately
        setIsLoading(false);
        
        // Get redirect path from URL or default to home
        const redirectPath = getRedirectPath();
        
        clearStoredRedirect();

        // Use replace instead of push to prevent back navigation to login
        setTimeout(() => {
          router.replace(redirectPath);
        }, 500);
      } catch (loginError) {
        // If login function fails, show error and reset loading
        console.error('Error in login function:', loginError);
        toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
        setIsLoading(false);
      }

    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('2FA verification error:', error);
      }
      
      const apiError = error as { error?: string; code?: string };
      const errorMessage = apiError.error || 'حدث خطأ أثناء التحقق';
      const errorCode = apiError.code || 'TWO_FACTOR_UNEXPECTED_ERROR';
      
      toast.error(errorMessage);
      setFormErrorMessage(errorMessage);
      setFormErrorCode(errorCode);
      setIsShaking(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
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
            console.error('JSON parsing error:', jsonError);
          }
          throw new Error('فشل في معالجة استجابة الخادم.');
        }
        clearTimeout(challengeTimeout);
      } catch (fetchError: any) {
        clearTimeout(challengeTimeout);
        
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        if (
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        toast.error(fetchError.message || 'فشلت المصادقة البيومترية', { duration: 5000 });
        setIsLoading(false);
        return;
      }

      // Request credential
      let credential: any;
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
      } catch (credError: any) {
        if (credError.name === 'NotAllowedError' || credError.name === 'NotSupportedError') {
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
            console.error('JSON parsing error:', jsonError);
          }
          throw new Error('فشل في معالجة استجابة الخادم.');
        }
        
        clearTimeout(verifyTimeout);

        try {
          login(data.token, data.user);
          toast.success('تم تسجيل الدخول بنجاح!');
          setIsLoading(false);
          
          // Get redirect path from URL or default to home
          const redirectPath = getRedirectPath();
          
          clearStoredRedirect();

          // Use replace and force navigation
          setTimeout(() => {
            router.replace(redirectPath);
          }, 500);
        } catch (loginError) {
          // If login function fails, show error and reset loading
          console.error('Error in login function:', loginError);
          toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
          setIsLoading(false);
        }
      } catch (verifyError: any) {
        clearTimeout(verifyTimeout);
        
        if (verifyError.name === 'AbortError' || verifyError.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        if (
          verifyError.message?.includes('Failed to fetch') ||
          verifyError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          setIsLoading(false);
          return;
        }

        toast.error(verifyError.message || 'فشلت المصادقة');
        setIsLoading(false);
        return;
      }

    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Biometric login error:', error);
      }
      
      if (
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.name === 'TypeError' ||
        !navigator.onLine
      ) {
        toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
      } else {
        toast.error(error?.message || 'فشلت المصادقة البيومترية');
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
            {typeof window !== 'undefined' && window.PublicKeyCredential && (
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

          {/* Google Login */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => {
            const redirectPath = getRedirectPath();
            clearStoredRedirect();
            window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
          }}
          disabled={isLoading}
            className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label="تسجيل الدخول باستخدام حساب جوجل"
          >
            <Chrome className="h-5 w-5" aria-hidden="true" />
            تسجيل الدخول بجوجل
          </motion.button>

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
                        console.error('Failed to create test account:', createError);
                      }
                      
                      toast.error('فشل تسجيل الدخول بالحساب التجريبي. يرجى المحاولة يدوياً.');
                      setIsLoading(false);
                      return;
                    }

                    const loginData = await loginResponse.json();

                    if (loginData.token && loginData.user) {
                      login(loginData.token, loginData.user);
                      toast.success('تم تسجيل الدخول بحساب تجريبي!', { duration: 3000 });
                      const redirectPath = getRedirectPath();
                      clearStoredRedirect();
                      router.push(redirectPath);
                      router.refresh();
                    } else {
                      toast.error('بيانات تسجيل الدخول غير صحيحة');
                    }
                  } catch (fetchError: any) {
                    clearTimeout(loginTimeout);
                    if (fetchError.name !== 'AbortError') {
                      toast.error('حدث خطأ أثناء تسجيل الدخول');
                    }
                  } finally {
                    setIsLoading(false);
                  }
                } catch (error) {
                  console.error('Test account login error:', error);
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
