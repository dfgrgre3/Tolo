'use client';

import { AnimatePresence, m } from 'framer-motion';
import { type UseFormRegister, type UseFormGetValues, type UseFormHandleSubmit } from 'react-hook-form';
import { PremiumInput } from '@/components/auth/premium-input';
import { Mail } from 'lucide-react';
import { ErrorBanner } from './error-banner';
import { PasswordInput } from './password-input';
import { RememberMeCheckbox } from './remember-me-checkbox';
import { LoginModeToggle } from './login-mode-toggle';
import { SubmitButton } from './submit-button';
import { AuthProviders } from './auth-providers';
import { TwoFAPanel } from './two-fa-panel';

interface LoginFormValues {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

interface LoginAuthViewProps {
  requires2FA: boolean;
  errorStatus: string | null;
  onResendVerification: () => void;
  handleSubmit: UseFormHandleSubmit<LoginFormValues>;
  onSubmit: (data: LoginFormValues) => void;
  register: UseFormRegister<LoginFormValues>;
  errors: { email?: { message?: string }; password?: { message?: string } };
  loginMode: 'password' | 'magic-link';
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  getValues: UseFormGetValues<LoginFormValues>;
  setLoginMode: (mode: 'password' | 'magic-link') => void;
  isSubmitting: boolean;
  twoFactorCode: string;
  setTwoFactorCode: (v: string) => void;
  onVerify2FA: (e: React.FormEvent) => void;
  setRequires2FA: (v: boolean) => void;
}

export function LoginAuthView({
  requires2FA,
  errorStatus,
  onResendVerification,
  handleSubmit,
  onSubmit,
  register,
  errors,
  loginMode,
  showPassword,
  setShowPassword,
  getValues,
  setLoginMode,
  isSubmitting,
  twoFactorCode,
  setTwoFactorCode,
  onVerify2FA,
  setRequires2FA,
}: LoginAuthViewProps) {
  return (
    <AnimatePresence mode="wait">
      {!requires2FA ? (
        <m.div
          key="login-form"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="space-y-10"
        >
          <AnimatePresence>
            {errorStatus && (
              <ErrorBanner errorStatus={errorStatus} onResendVerification={onResendVerification} />
            )}
          </AnimatePresence>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <PremiumInput
              label="البريد الإلكتروني"
              icon={<Mail size={22} strokeWidth={2.5} />}
              registration={register('email')}
              error={errors.email}
            />

            <AnimatePresence>
              {loginMode === 'password' && (
                <PasswordInput
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  registration={register('password')}
                  error={errors.password}
                />
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-2">
              <RememberMeCheckbox registration={register('rememberMe')} getValues={getValues} />
              <LoginModeToggle loginMode={loginMode} setLoginMode={setLoginMode} />
            </div>

            <SubmitButton isSubmitting={isSubmitting} loginMode={loginMode} />
          </form>

          <AuthProviders />
        </m.div>
      ) : (
        <TwoFAPanel
          twoFactorCode={twoFactorCode}
          setTwoFactorCode={setTwoFactorCode}
          isSubmitting={isSubmitting}
          onVerify2FA={onVerify2FA}
          onBack={() => setRequires2FA(false)}
        />
      )}
    </AnimatePresence>
  );
}
