'use client';

import { motion } from 'framer-motion';
import { useRegisterForm } from '@/hooks/auth/useRegisterForm';
import { NameField } from '@/components/auth/NameField';
import { EmailField } from '@/components/auth/EmailField';
import { PasswordField } from '@/components/auth/PasswordField';
import { TermsCheckbox } from '@/components/auth/TermsCheckbox';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AlternativeLoginMethods } from '@/components/auth/AlternativeLoginMethods';

export default function RegisterForm() {
  const {
    formData,
    showPassword,
    showConfirmPassword,
    isLoading,
    focusedField,
    isGoogleOAuthEnabled,
    passwordInputRef,
    confirmPasswordInputRef,
    setShowPassword,
    setShowConfirmPassword,
    setFocusedField,
    handleInputChange,
    handleSubmit,
    fieldErrors,
  } = useRegisterForm();

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
      }}
      initial="initial"
      animate="steady"
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      role="form"
      aria-label="نموذج إنشاء حساب جديد"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">إنشاء حساب جديد</h2>
        <p className="mt-2 text-sm text-slate-300">
          انضم إلينا وابدأ رحلتك التعليمية
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <NameField
          value={formData.name}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          isFocused={focusedField === 'name'}
          disabled={isLoading}
          error={fieldErrors.name}
        />

        {/* Email Field */}
        <EmailField
          value={formData.email}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          isFocused={focusedField === 'email'}
          disabled={isLoading}
          error={fieldErrors.email}
        />

        {/* Password Field */}
        <PasswordField
          value={formData.password}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          isFocused={focusedField === 'password'}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          disabled={isLoading}
          inputRef={passwordInputRef as React.RefObject<HTMLInputElement>}
          label="كلمة المرور"
          name="password"
          autoComplete="new-password"
          error={fieldErrors.password}
        />

        {/* Password Strength Indicator */}
        <PasswordStrengthIndicator password={formData.password} />

        {/* Confirm Password Field */}
        <PasswordField
          value={formData.confirmPassword}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
          isFocused={focusedField === 'confirmPassword'}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
          disabled={isLoading}
          inputRef={confirmPasswordInputRef as React.RefObject<HTMLInputElement>}
          label="تأكيد كلمة المرور"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
        />

        {/* Terms Checkbox */}
        <TermsCheckbox
          checked={formData.acceptTerms}
          onChange={handleInputChange}
          disabled={isLoading}
        />

        {/* Submit Button */}
        <SubmitButton
          isLoading={isLoading}
          disabled={!formData.acceptTerms}
          loadingText="" // Remove text as requested
        >
          إنشاء الحساب
        </SubmitButton>

        {/* Alternative Login Methods */}
        <AlternativeLoginMethods
          isLoading={isLoading}
          isGoogleOAuthEnabled={isGoogleOAuthEnabled}
          mode="register"
        />
      </form>
    </motion.div>
  );
}
