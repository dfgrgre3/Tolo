'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';
import {
  evaluatePassword,
  validateProfileState,
  validateSecurityState,
} from './validators';
import type {
  RegistrationFeedbackState,
  RegistrationFormErrors,
  RegistrationProfileState,
  RegistrationResult,
  RegistrationSecurityState,
  RegistrationStep,
} from './types';

interface UseRegistrationFlowOptions {
  onClose?: () => void;
}

export function useRegistrationFlow(options: UseRegistrationFlowOptions = {}) {
  const { onClose } = options;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useEnhancedAuth();
  const loading = false;
  const register = async (data: { email: string; password: string; name: string }) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  };

  const [currentStep, setCurrentStep] =
    useState<RegistrationStep>('profile');
  const [profile, setProfile] = useState<RegistrationProfileState>({
    fullName: '',
    email: '',
  });
  const [security, setSecurity] = useState<RegistrationSecurityState>({
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    enableTwoFactor: true,
    marketingOptIn: false,
  });
  const [feedback, setFeedback] = useState<RegistrationFeedbackState | null>(
    null,
  );
  const [formErrors, setFormErrors] = useState<RegistrationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const passwordEvaluation = useMemo(
    () => evaluatePassword(security.password),
    [security.password],
  );

  useEffect(() => {
    if (user && currentStep !== 'success') {
      router.replace('/');
    }
  }, [user, currentStep, router]);

  const handleProfileChange = useCallback(
    (field: keyof RegistrationProfileState, value: string) => {
      setProfile((prev) => ({
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

  const handleSecurityFieldChange = useCallback(
    (field: 'password' | 'confirmPassword', value: string) => {
      setSecurity((prev) => ({
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

  const handleSecurityToggleChange = useCallback(
    (
      field: 'acceptTerms' | 'enableTwoFactor' | 'marketingOptIn',
      value: boolean,
    ) => {
      setSecurity((prev) => ({
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

  const handleProfileSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback(null);

      const validation = validateProfileState(profile);
      if (!validation.valid) {
        setFormErrors((prev) => ({
          ...prev,
          ...validation.errors,
        }));
        setFeedback({
          type: 'error',
          message: 'يرجى مراجعة البيانات وإعادة المحاولة.',
        });
        return;
      }

      setFormErrors({});
      setCurrentStep('security');
    },
    [profile],
  );

  const handleSecuritySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback(null);

      const validation = validateSecurityState(
        security,
        passwordEvaluation.score,
      );

      if (!validation.valid) {
        setFormErrors((prev) => ({
          ...prev,
          ...validation.errors,
        }));
        setFeedback({
          type: 'error',
          message: 'تأكد من قوة كلمة المرور والموافقة على الشروط.',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const outcome = await register({
          email: profile.email.trim().toLowerCase(),
          password: security.password,
          name: profile.fullName.trim(),
        });

        const postActions: RegistrationResult['postActions'] = [];
        let marketingOptInApplied: boolean | undefined;
        let twoFactorSetup: RegistrationResult['twoFactorSetup'] | undefined;

        // Token is in httpOnly cookie (set by server after registration/login)
        // No need to get token from localStorage or send Authorization header
        // The server will read the token from cookies automatically

        // Update marketing/email notification preference
        // Use cookies for authentication (credentials: 'include')
        try {
          const response = await fetch('/api/user/notification-settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: send cookies for authentication
            body: JSON.stringify({
              emailNotifications: security.marketingOptIn,
              smsNotifications: false,
              phone: null,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update notification settings');
          }

          marketingOptInApplied = true;
          postActions.push({
            type: 'success',
            message: security.marketingOptIn
              ? 'تم تفعيل رسائل البريد الذكية بنجاح.'
              : 'تم حفظ تفضيلات البريد الإلكتروني.',
          });
        } catch (error) {
          marketingOptInApplied = false;
          postActions.push({
            type: 'warning',
            message:
              'تعذر تحديث تفضيلات البريد الآن، يمكنك إعادة المحاولة من صفحة الإشعارات.',
          });
        }

        // Initiate two-factor setup if requested
        // Use cookies for authentication (credentials: 'include')
        if (security.enableTwoFactor) {
          try {
            const response = await fetch('/api/auth/two-factor', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Important: send cookies for authentication
              body: JSON.stringify({ action: 'setup' }),
            });

            if (!response.ok) {
              throw new Error('Failed to setup 2FA');
            }

            const data = await response
              .json()
              .catch(() => ({} as Record<string, unknown>));

            if (data?.secret) {
              twoFactorSetup = {
                secret: data.secret as string,
                backupCodes: Array.isArray(data.backupCodes)
                  ? (data.backupCodes as string[])
                  : [],
                message:
                  typeof data.message === 'string' ? data.message : undefined,
              };

              postActions.push({
                type: 'info',
                message:
                  'ابدأ إعداد المصادقة الثنائية عبر تطبيق المصادقة باستخدام الرمز المولد لك.',
              });
            } else {
              postActions.push({
                type: 'warning',
                message:
                  'تم تسجيل رغبتك في المصادقة الثنائية، أكمل التفعيل من صفحة الأمان.',
              });
            }
          } catch (error) {
            postActions.push({
              type: 'warning',
              message:
                'تعذر بدء المصادقة الثنائية آلياً، يمكنك تفعيلها لاحقاً من الإعدادات.',
            });
          }
        }

        const registrationResult: RegistrationResult = {
          userId: outcome.user.id,
          email: outcome.user.email,
          fullName: outcome.user.name,
          verificationLink: outcome.verificationLink,
          marketingOptInApplied,
          twoFactorSetup,
          postActions: postActions.length ? postActions : undefined,
        };

        setResult(registrationResult);

        setFeedback({
          type: 'success',
          message:
            outcome.message ||
            'تم إنشاء الحساب بنجاح. يرجى تفعيل البريد الإلكتروني لإكمال العملية.',
        });
        setCurrentStep('success');
      } catch (error: unknown) {
        const err = error as {
          message?: string;
          status?: number;
          code?: string;
          details?: { email?: string | string[] };
        };
        const nextErrors: RegistrationFormErrors = {};
        let message =
          err?.message ||
          'حدث خطأ أثناء إنشاء الحساب. أعد المحاولة لاحقاً.';

        if (
          err?.status === 409 ||
          err?.code === 'USER_EXISTS' ||
          err?.code === 'EMAIL_EXISTS'
        ) {
          nextErrors.email = 'هذا البريد مسجل مسبقاً.';
          message = 'البريد الإلكتروني مستخدم بالفعل.';
          setCurrentStep('profile');
        }

        if (err?.details?.email) {
          nextErrors.email = Array.isArray(err.details.email)
            ? err.details.email[0]
            : 'تحقق من البريد الإلكتروني.';
        }

        setFormErrors((prev) => ({
          ...prev,
          ...nextErrors,
        }));

        setFeedback({
          type: 'error',
          message,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [profile, security, passwordEvaluation.score, register],
  );

  const handleBackToProfile = useCallback(() => {
    setCurrentStep('profile');
  }, []);

  const handleContinue = useCallback(() => {
    const redirectTo = searchParams.get('redirect') || '/';
    router.replace(redirectTo);
    onClose?.();
  }, [router, searchParams, onClose]);

  return {
    currentStep,
    profile,
    security,
    feedback,
    formErrors,
    isSubmitting: isSubmitting || loading,
    result,
    passwordEvaluation,
    handleProfileSubmit,
    handleSecuritySubmit,
    handleProfileChange,
    handleSecurityFieldChange,
    handleSecurityToggleChange,
    handleBackToProfile,
    handleContinue,
  };
}
