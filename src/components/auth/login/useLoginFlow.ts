'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';
import {
  type CredentialsState,
  type LoginFeedbackState,
  type LoginFormErrors,
  type LoginStep,
  type TwoFactorState,
} from './types';
import { LOGIN_STEPS, RESEND_COOLDOWN_SECONDS } from './constants';

/** Email validation regex pattern */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UseLoginFlowOptions {
  onClose?: () => void;
}

interface CredentialValidationResult {
  valid: boolean;
  errors: LoginFormErrors;
  message: string | null;
  normalizedEmail: string;
}

export function useLoginFlow(options: UseLoginFlowOptions = {}) {
  const { onClose } = options;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, verifyTwoFactor, resendTwoFactorCode, loginWithSocial } =
    useEnhancedAuth();

  const [credentials, setCredentials] = useState<CredentialsState>({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [currentStep, setCurrentStep] = useState<LoginStep>('credentials');
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState | null>(
    null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [feedback, setFeedback] = useState<LoginFeedbackState | null>(null);
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    const redirectTo = searchParams.get('redirect') || '/';
    router.replace(redirectTo);
    onClose?.();
  }, [user, router, searchParams, onClose]);

  useEffect(() => {
    if (!resendCooldown) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const currentStepIndex = useMemo(
    () => LOGIN_STEPS.indexOf(currentStep),
    [currentStep],
  );

  const validateCredentials = useCallback((): CredentialValidationResult => {
    const errors: LoginFormErrors = {};
    let message: string | null = null;

    const normalizedEmail = credentials.email.trim();
    const passwordValue = credentials.password;

    if (!normalizedEmail || passwordValue.trim().length === 0) {
      if (!normalizedEmail) {
        errors.email = 'يرجى إدخال البريد الإلكتروني';
      }

      if (passwordValue.trim().length === 0) {
        errors.password = 'يرجى إدخال كلمة المرور';
      }

      message = 'يرجى إدخال جميع الحقول';
    }

    if (!errors.email && normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
      message = 'البريد الإلكتروني غير صحيح';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      message,
      normalizedEmail,
    };
  }, [credentials.email, credentials.password]);

  const handleCredentialsSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback(null);

      const validation = validateCredentials();

      if (!validation.valid) {
        setFormErrors(validation.errors);

        if (validation.message) {
          setFeedback({
            type: 'error',
            message: validation.message,
          });
        }

        return;
      }

      setFormErrors({});
      setIsSubmitting(true);

      try {
        const result = await login({
          ...credentials,
          email: validation.normalizedEmail,
        });

        if (result.requiresTwoFactor && result.loginAttemptId) {
          setTwoFactorState({
            loginAttemptId: result.loginAttemptId,
            expiresAt: result.expiresAt,
            methods: result.methods ?? ['email'],
            debugCode: result.debugCode,
          });
          setTwoFactorCode('');
          setCurrentStep('two-factor');
        setFeedback({
          type: 'success',
          message: 'تم إرسال رمز التحقق بنجاح. يرجى إدخال الرمز المرسل.',
        });
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          return;
        }

        setFeedback({
          type: 'success',
          message: 'تم تسجيل الدخول بنجاح.',
        });
        setCurrentStep('success');
      } catch (error: any) {
        const newErrors: LoginFormErrors = {};
        let message =
          error?.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';

        const emailIssues =
          Array.isArray(error?.details?.email) &&
          error.details.email.length > 0;
        const passwordIssues =
          Array.isArray(error?.details?.password) &&
          error.details.password.length > 0;

        if (emailIssues) {
          newErrors.email = 'البريد الإلكتروني غير صحيح';
          message = 'البريد الإلكتروني غير صحيح';
        }

        if (passwordIssues) {
          newErrors.password = 'يرجى إدخال كلمة المرور';
          if (!emailIssues) {
            message = 'يرجى إدخال كلمة المرور';
          }
        }

        if (error?.status === 401) {
          newErrors.password = 'كلمة المرور غير صحيحة';
          message = 'كلمة المرور غير صحيحة';
        }

        if (typeof error?.code === 'string' && error.code.length > 0) {
          message = error.message || message;
        }

        setFormErrors(Object.keys(newErrors).length ? newErrors : {});
        setFeedback({
          type: 'error',
          message,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [credentials, login, validateCredentials],
  );

  const handleTwoFactorSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!twoFactorState?.loginAttemptId) {
        setFeedback({
          type: 'error',
          message:
            '�?�? �?�?�?�? ���?�? �?�?�?�? �?�?��. ��?�? �?�?�?�?�?�?�?�? �?�? �?�?�?�?�?�?�?.',
        });
        setCurrentStep('credentials');
        return;
      }

      setFeedback(null);
      setIsSubmitting(true);

      try {
        await verifyTwoFactor({
          loginAttemptId: twoFactorState.loginAttemptId,
          code: twoFactorCode.trim(),
          trustDevice,
        });

        setCurrentStep('success');
        setFeedback({
          type: 'success',
          message:
            '�?�? �?�?�?�?�?�? �?�? �?�?�?�?�� �?�?�?�?�?. �?�?�?�? �?�?�?�?�?�? �?�?�? �?�?�?�? �?�?�?�?�?�?.',
        });
      } catch (error: any) {
        setFeedback({
          type: 'error',
          message:
            error?.message ||
            '�?�?���? �?�?�?�?�?�? �?�? �?�?�?�?��. �?��?�? �?�? ���?�?�? �?�?�?�?�? �?�?�?�?�?�?.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [twoFactorCode, twoFactorState, trustDevice, verifyTwoFactor],
  );

  const handleResend = useCallback(async () => {
    if (!twoFactorState?.loginAttemptId || resendCooldown > 0) {
      return;
    }

    try {
      await resendTwoFactorCode({
        loginAttemptId: twoFactorState.loginAttemptId,
        method: twoFactorState.methods.includes('sms') ? 'sms' : 'email',
      });
      setFeedback({
        type: 'success',
        message: '�?�? �?�?�?�?�? �?�?�� �?�?�?�? �?�?�?�?�?.',
      });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message:
          error?.message ||
          '�?�?���? �?�?�?�?�? �?�?�?�?��. �?�?�?�? �?�?�? ��?�?�? �?�?�?�?�?�?.',
      });
    }
  }, [resendCooldown, resendTwoFactorCode, twoFactorState]);

  const handleSocialLogin = useCallback(
    async (provider: 'google' | 'github' | 'twitter') => {
      try {
        await loginWithSocial(provider);
      } catch (error: any) {
        setFeedback({
          type: 'error',
          message:
            error?.message ||
            '�?�?���? �?�?�? �?�?�?�?�? �?�?�?�?�?�? �?�?�? �?�?�?�?�?�?�? �?�?�?�?�?�?�?�?�?�?.',
        });
      }
    },
    [loginWithSocial],
  );

  const handleTwoFactorCodeChange = useCallback((value: string) => {
    setTwoFactorCode(value);
  }, []);

  const handleTrustDeviceChange = useCallback((checked: boolean) => {
    setTrustDevice(checked);
  }, []);

  const handleCredentialFieldChange = useCallback(
    (field: keyof CredentialsState, value: string) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: value,
      }));

      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    },
    [],
  );

  const handleRememberMeChange = useCallback((checked: boolean) => {
    setCredentials((prev) => ({
      ...prev,
      rememberMe: checked,
    }));
  }, []);

  const handleBackToCredentials = useCallback(() => {
    setCurrentStep('credentials');
    setTwoFactorState(null);
  }, []);

  const handleContinue = useCallback(() => {
    const redirectTo = searchParams.get('redirect') || '/';
    router.replace(redirectTo);
    onClose?.();
  }, [router, searchParams, onClose]);

  const formatTimeLeft = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    credentials,
    currentStep,
    currentStepIndex,
    feedback,
    formErrors,
    isSubmitting,
    resendCooldown,
    steps: LOGIN_STEPS,
    trustDevice,
    twoFactorCode,
    twoFactorState,
    formatTimeLeft,
    handleBackToCredentials,
    handleContinue,
    handleCredentialFieldChange,
    handleCredentialsSubmit,
    handleRememberMeChange,
    handleResend,
    handleSocialLogin,
    handleTwoFactorCodeChange,
    handleTwoFactorSubmit,
    handleTrustDeviceChange,
  };
}
