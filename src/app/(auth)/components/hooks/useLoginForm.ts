/**
 * Custom hook for managing login form state and logic
 * Refactored to use composed hooks for better maintainability
 */

import { useEffect } from 'react';
import { useAnimation } from 'framer-motion';
import { useLoginEffects } from './useLoginEffects';
import { useLoginState } from './useLoginState';
import { useLoginValidation } from './useLoginValidation';
import { useLoginSubmission } from './useLoginSubmission';
import { toast } from 'sonner';

export const useLoginForm = () => {
  const formControls = useAnimation();

  // Initialize state hook
  const state = useLoginState();

  // Initialize validation hook
  const { validateForm, validateTwoFactorCode } = useLoginValidation();

  // Initialize submission hook
  const { submitLogin, submitTwoFactor } = useLoginSubmission(state);

  // Side effects
  useLoginEffects({
    isShaking: state.isShaking,
    formControls,
    setIsShaking: state.setIsShaking,
    setDeviceFingerprint: state.setDeviceFingerprint,
    setIsGoogleOAuthEnabled: state.setIsGoogleOAuthEnabled,
    setFormErrorMessage: state.setFormErrorMessage,
    setFormErrorCode: state.setFormErrorCode,
    setLockoutSeconds: state.setLockoutSeconds,
    lockoutSeconds: state.lockoutSeconds,
    isLoading: state.isLoading,
    showTwoFactor: state.showTwoFactor,
    emailInputRef: state.emailInputRef,
    passwordInputRef: state.passwordInputRef,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateForm(state.formData);
    if (!validation.isValid) {
      state.setFieldErrors(validation.errors);
      state.setIsShaking(true);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    await submitLogin();
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateTwoFactorCode(state.twoFactorCode)) {
      toast.error('رمز التحقق غير صحيح');
      state.setIsShaking(true);
      return;
    }

    await submitTwoFactor();
  };

  const isFormLocked = state.lockoutSeconds !== null && state.lockoutSeconds > 0;

  return {
    ...state,
    isFormLocked,
    formControls,
    handleSubmit,
    handleTwoFactorSubmit,
  };
};

