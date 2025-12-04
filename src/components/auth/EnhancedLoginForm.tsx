'use client';

/**
 * Enhanced Login Form - Refactored Version
 * 
 * This is a refactored version of the login form with improved code organization:
 * - Separated into smaller, reusable components
 * - Custom hooks for state management and side effects
 * - Utility functions for validation and helpers
 * - Type definitions in separate files
 * 
 * ⚠️ IMPORTANT: There is NO EnhancedLoginForm.old.tsx file in this project.
 * 
 * This is the main and only version of the enhanced login form.
 * 
 * ✅ CORRECT imports:
 *   import EnhancedLoginForm from '@/components/auth/EnhancedLoginForm';
 *   import { EnhancedLoginForm } from '@/components/auth';
 * 
 * ❌ INCORRECT (will cause errors):
 *   import EnhancedLoginForm from '@/components/auth/EnhancedLoginForm.old';
 * 
 * If you see any imports referencing EnhancedLoginForm.old.tsx, they should be
 * removed immediately as the file does not exist and will cause build errors.
 */

import { motion } from 'framer-motion';
import { useLoginForm } from './hooks/useLoginForm';
import { useLoginEffects } from './hooks/useLoginEffects';
import { useAlternativeLogin } from './hooks/useAlternativeLogin';
import { EmailField } from './components/EmailField';
import { PasswordField } from './components/PasswordField';
import { ErrorBanner } from './components/ErrorBanner';
import { RiskAlert } from './components/RiskAlert';
import { CaptchaSection } from './components/CaptchaSection';
import { SubmitButton } from './components/SubmitButton';
import { DeviceInfo } from './components/DeviceInfo';
import { TwoFactorForm } from './components/TwoFactorForm';
import { AlternativeLoginMethods } from './components/AlternativeLoginMethods';

export default function EnhancedLoginForm() {
  // Main login form logic
  const {
    formData,
    showPassword,
    isLoading,
    showTwoFactor,
    twoFactorCode,
    formErrorMessage,
    formErrorCode,
    fieldErrors,
    isShaking,
    deviceFingerprint,
    riskLevel,
    requiresCaptcha,
    captchaToken,
    isFormLocked,
    focusedField,
    isGoogleOAuthEnabled,
    emailInputRef,
    passwordInputRef,
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
    formControls,
    setIsShaking,
    setDeviceFingerprint,
    setIsGoogleOAuthEnabled,
    setLockoutSeconds,
    lockoutSeconds,
  } = useLoginForm();

  // Side effects and event handlers
  useLoginEffects({
    isShaking,
    formControls,
    setIsShaking,
    setDeviceFingerprint,
    setIsGoogleOAuthEnabled,
    setFormErrorMessage,
    setFormErrorCode,
    setLockoutSeconds,
    lockoutSeconds,
    isLoading,
    showTwoFactor,
    emailInputRef,
    passwordInputRef,
  });

  // Alternative login methods
  const {
    isLoading: isAltLoading,
    handlePasskeyLogin,
  } = useAlternativeLogin();

  // Show two-factor form if required
  if (showTwoFactor) {
    return (
      <TwoFactorForm
        twoFactorCode={twoFactorCode}
        onCodeChange={setTwoFactorCode}
        onSubmit={handleTwoFactorSubmit}
        onBack={() => {
          setShowTwoFactor(false);
          setFormErrorMessage(null);
          setFormErrorCode(null);
        }}
        isLoading={isLoading}
        errorMessage={formErrorMessage}
        errorCode={formErrorCode}
        formControls={formControls}
      />
    );
  }

  // Main login form
  return (
    <motion.div
      variants={{
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
      }}
      initial="initial"
      animate={formControls}
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      role="form"
      aria-label="نموذج تسجيل الدخول"
    >
      {/* Risk Alert */}
      <RiskAlert riskLevel={riskLevel} />

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
      <ErrorBanner message={formErrorMessage} code={formErrorCode} />

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <EmailField
          value={formData.email}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          error={fieldErrors.email}
          isFocused={focusedField === 'email'}
          disabled={isLoading || isFormLocked}
          inputRef={emailInputRef}
        />

        {/* Password Field */}
        <PasswordField
          value={formData.password}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          error={fieldErrors.password}
          isFocused={focusedField === 'password'}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          disabled={isLoading || isFormLocked}
          inputRef={passwordInputRef}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label
            htmlFor="rememberMe"
            className="flex items-center gap-2 text-slate-200 cursor-pointer"
          >
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

        {/* CAPTCHA Section */}
        <CaptchaSection
          requiresCaptcha={requiresCaptcha}
          captchaToken={captchaToken}
          onVerify={setCaptchaToken}
          onError={(error) => {
            /* toast.error is called in CaptchaSection */
          }}
        />

        {/* Submit Button */}
        <SubmitButton
          isLoading={isLoading}
          disabled={requiresCaptcha && !captchaToken}
        />

        {/* Alternative Login Methods */}
        <AlternativeLoginMethods
          isLoading={isLoading || isAltLoading}
          isGoogleOAuthEnabled={isGoogleOAuthEnabled}
          onPasskeyLogin={handlePasskeyLogin}
        />
      </form>

      {/* Device Info */}
      <DeviceInfo deviceFingerprint={deviceFingerprint} />
    </motion.div>
  );
}

