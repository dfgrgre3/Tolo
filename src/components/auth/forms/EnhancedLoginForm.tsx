'use client';

/**
 * Enhanced Login Form
 * Modular login form with security features and two-factor authentication.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLogin } from '@/hooks/use-login';
import { useAlternativeLogin } from '@/hooks/auth/useAlternativeLogin';
import { EmailField } from '@/components/auth/EmailField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert';
import { RiskAlert } from '@/components/auth/RiskAlert';
import { CaptchaSection } from '@/components/auth/CaptchaSection';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { DeviceInfo } from '@/components/auth/DeviceInfo';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { AlternativeLoginMethods } from '@/components/auth/AlternativeLoginMethods';
import { LockoutCountdown } from '@/components/auth/LockoutCountdown';
import { Controller } from 'react-hook-form';
import { useState } from 'react';

// Motion variants (extracted for performance)
const formVariants: any = {
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
};

export default function EnhancedLoginForm() {
  // Main login form logic
  const {
    form,
    onSubmit,
    isLoading,
    showTwoFactor,
    twoFactorCode,
    setTwoFactorCode,
    onTwoFactorSubmit,
    setShowTwoFactor,
    isShaking,
    lockoutSeconds,
    setLockoutSeconds,
    riskLevel,
    formControls,
  } = useLogin();

  // Local UI state for password visibility and focus
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Alternative login methods
  const {
    isLoading: isAltLoading,
    handlePasskeyLogin,
  } = useAlternativeLogin();

  const { errors: fieldErrors } = form.formState;
  const generalError = fieldErrors.root?.message || null;

  // Show two-factor form if required
  if (showTwoFactor) {
    return (
      <TwoFactorForm
        twoFactorCode={twoFactorCode}
        onCodeChange={setTwoFactorCode}
        onSubmit={(e) => {
           e.preventDefault();
           onTwoFactorSubmit(twoFactorCode);
        }}
        onBack={() => {
          setShowTwoFactor(false);
          // optional: clear error
        }}
        isLoading={isLoading}
        errorMessage={generalError}
        errorCode={null} // useLogin handles generic errors via root message mainly
        formControls={formControls}
      />
    );
  }

  // Main login form
  return (
    <motion.div
      variants={formVariants}
      initial="initial"
      animate={isShaking ? 'shake' : 'steady'}
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      role="form"
      aria-label="نموذج تسجيل الدخول"
    >
      {/* Risk Alert */}
      <RiskAlert riskLevel={riskLevel || 'low'} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-center"
      >
        <h2 className="text-2xl font-bold text-white">مرحباً بعودتك</h2>
        <p className="mt-2 text-sm text-slate-300">سجّل دخولك للوصول إلى حسابك</p>
      </motion.div>

      {/* Error Banner */}
      <AuthErrorAlert message={generalError} code={null} />

      {/* Lockout Countdown */}
      {lockoutSeconds !== null && lockoutSeconds > 0 && (
        <LockoutCountdown
          lockedUntil={Date.now() + lockoutSeconds * 1000}
          onLockoutEnd={() => setLockoutSeconds(null)}
          className="mb-5"
        />
      )}

      {/* Login Form */}
      <form onSubmit={onSubmit} className="space-y-5" aria-busy={isLoading}>
        {/* Email Field */}
        <Controller
          control={form.control}
          name="email"
          render={({ field }) => (
            <EmailField
              value={field.value}
              onChange={field.onChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => {
                field.onBlur();
                setFocusedField(null);
              }}
              error={fieldErrors.email?.message}
              isFocused={focusedField === 'email'}
              inputRef={field.ref}
              disabled={isLoading || (lockoutSeconds !== null && lockoutSeconds > 0)}
            />
          )}
        />

        {/* Password Field */}
        <Controller
          control={form.control}
          name="password"
          render={({ field }) => (
            <PasswordField
              value={field.value}
              onChange={field.onChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => {
                field.onBlur();
                setFocusedField(null);
              }}
              error={fieldErrors.password?.message}
              isFocused={focusedField === 'password'}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              inputRef={field.ref}
              disabled={isLoading || (lockoutSeconds !== null && lockoutSeconds > 0)}
            />
          )}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label
            htmlFor="rememberMe"
            className="flex items-center gap-2 text-slate-200 cursor-pointer"
          >
            <Controller
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                    <input
                    id="rememberMe"
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-slate-400 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-400"
                    aria-label="تذكرني"
                    />
                )}
            />
            تذكرني
          </label>
          <Link
            href="/forgot-password"
            className="text-indigo-300 hover:text-indigo-200 transition"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {/* CAPTCHA Section - Placeholder if needed, pass props if useLogin exposes them */}
        {/* <CaptchaSection ... /> */} 

        {/* Submit Button */}
        <SubmitButton
          isLoading={isLoading}
          disabled={lockoutSeconds !== null && lockoutSeconds > 0}
          loadingText="جارٍ تسجيل الدخول..."
        />

        {/* Alternative Login Methods */}
        <AlternativeLoginMethods
          isLoading={isLoading || isAltLoading}
          isGoogleOAuthEnabled={true}
          isFacebookOAuthEnabled={true}
          isAppleOAuthEnabled={false}
          onPasskeyLogin={handlePasskeyLogin}
        />
      </form>

      {/* Device Info (optional) */}
      <DeviceInfo deviceFingerprint={null} />
    </motion.div>
  );
}
