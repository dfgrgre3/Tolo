'use client';

import { motion } from 'framer-motion';
import { useRegister } from '@/hooks/use-register';
import { NameField } from '@/components/auth/NameField';
import { EmailField } from '@/components/auth/EmailField';
import { PasswordField } from '@/components/auth/PasswordField';
import { TermsCheckbox } from '@/components/auth/TermsCheckbox';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AlternativeLoginMethods } from '@/components/auth/AlternativeLoginMethods';
import { Controller } from 'react-hook-form';
import { useState } from 'react';

export default function EnhancedRegisterForm() {
  const { form, onSubmit, isLoading } = useRegister();
  
  // Local UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { errors: fieldErrors } = form.formState;
  const passwordValue = form.watch('password');

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

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Name Field */}
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <NameField
                value={field.value}
                onChange={field.onChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => {
                    field.onBlur();
                    setFocusedField(null);
                }}
                isFocused={focusedField === 'name'}
                disabled={isLoading}
                error={fieldErrors.name?.message}
                inputRef={field.ref}
            />
          )}
        />

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
                isFocused={focusedField === 'email'}
                disabled={isLoading}
                error={fieldErrors.email?.message}
                inputRef={field.ref}
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
                isFocused={focusedField === 'password'}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                inputRef={field.ref}
                label="كلمة المرور"
                name="password"
                autoComplete="new-password"
                error={fieldErrors.password?.message}
                />
            )}
        />

        {/* Password Strength Indicator */}
        <PasswordStrengthIndicator password={passwordValue || ''} />

        {/* Confirm Password Field */}
        <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
                <PasswordField
                value={field.value || ''}
                onChange={field.onChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => {
                    field.onBlur();
                    setFocusedField(null);
                }}
                isFocused={focusedField === 'confirmPassword'}
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                inputRef={field.ref}
                label="تأكيد كلمة المرور"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                error={fieldErrors.confirmPassword?.message}
                />
            )}
        />

        {/* Terms Checkbox */}
        <Controller
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
                <TermsCheckbox
                checked={field.value}
                onChange={field.onChange}
                disabled={isLoading}
                error={fieldErrors.acceptTerms?.message}
                />
            )}
        />

        {/* Submit Button */}
        <SubmitButton
          isLoading={isLoading}
          disabled={!form.watch('acceptTerms')}
          loadingText="" 
        >
          إنشاء الحساب
        </SubmitButton>

        {/* Alternative Login Methods */}
        <AlternativeLoginMethods
          isLoading={isLoading}
          isGoogleOAuthEnabled={true} // Hardcoded or fetch from env/config
          mode="register"
        />
      </form>
    </motion.div>
  );
}
