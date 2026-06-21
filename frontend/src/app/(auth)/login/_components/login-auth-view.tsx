'use client';

import { AnimatePresence, m } from 'framer-motion';
import { type UseFormRegister, type UseFormHandleSubmit } from 'react-hook-form';
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
  readonly requires2FA: boolean;
  readonly errorStatus: string | null;
  readonly onResendVerification: () => void;
  readonly onDismiss: () => void;
  readonly handleSubmit: UseFormHandleSubmit<LoginFormValues>;
  readonly onSubmit: (data: LoginFormValues) => void;
  readonly register: UseFormRegister<LoginFormValues>;
  readonly errors: {
    readonly email?: { readonly message?: string };
    readonly password?: { readonly message?: string };
  };
  readonly loginMode: 'password' | 'magic-link';
  readonly showPassword: boolean;
  readonly setShowPassword: (v: boolean) => void;
  readonly rememberMeChecked: boolean;
  readonly setLoginMode: (mode: 'password' | 'magic-link') => void;
  readonly isSubmitting: boolean;
  readonly twoFactorCode: string;
  readonly setTwoFactorCode: (v: string) => void;
  readonly onVerify2FA: (e: React.FormEvent) => void;
  readonly setRequires2FA: (v: boolean) => void;
}

export function LoginAuthView({
  requires2FA,
  errorStatus,
  onResendVerification,
  onDismiss,
  handleSubmit,
  onSubmit,
  register,
  errors,
  loginMode,
  showPassword,
  setShowPassword,
  rememberMeChecked,
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
              <ErrorBanner
                errorStatus={errorStatus}
                onResendVerification={onResendVerification}
                onDismiss={onDismiss}
              />
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
              <RememberMeCheckbox registration={register('rememberMe')} checked={rememberMeChecked} />
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
          title={loginMode === 'magic-link' ? 'الدخول السريع' : 'الدرع المزدوج'}
          subtitle={loginMode === 'magic-link' ? 'أدخل رمز الدخول المكون من 6 أرقام المرسل لبريدك الإلكتروني' : 'أدخل رمز الحماية المكون من 6 أرقام لتأكيد الهوية'}
        />
      )}
    </AnimatePresence>
  );
}
