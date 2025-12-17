'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useRegisterState } from './useRegisterState';
import { useRegisterValidation } from './useRegisterValidation';
import { useRegisterSubmission } from './useRegisterSubmission';
import { toast } from 'sonner';
import { RegisterFormData } from './types';

export type { RegisterFormData } from './types';

export function useRegisterForm() {
  // Initialize state hook
  const state = useRegisterState();

  // Initialize validation hook
  const { validateForm } = useRegisterValidation();

  // Initialize submission hook
  const { submitRegister } = useRegisterSubmission(state);

  // Check OAuth provider status
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/oauth/status');
        if (response.ok) {
          const data = await response.json();
          state.setIsGoogleOAuthEnabled(data.providers?.google?.enabled ?? false);
        }
      } catch (error) {
        logger.error('Failed to check OAuth status:', error);
        state.setIsGoogleOAuthEnabled(false);
      }
    };

    checkOAuthStatus();
  }, [state.setIsGoogleOAuthEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(state.formData);
    if (!validation.isValid) {
      state.setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    await submitRegister(state.formData);
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?type=register';
  };

  return {
    ...state,
    handleSubmit,
    handleGoogleSignup,
  };
}
