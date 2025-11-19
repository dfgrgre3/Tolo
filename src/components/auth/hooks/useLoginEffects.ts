/**
 * Custom hook for login form side effects and event handlers
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { safeWindow, isBrowser } from '@/lib/safe-client-utils';
import { getClientDeviceFingerprint } from '@/lib/security/device-fingerprint';
import type { DeviceFingerprint } from '../types/login-form.types';

interface UseLoginEffectsProps {
  isShaking: boolean;
  formControls: any;
  setIsShaking: (value: boolean) => void;
  setDeviceFingerprint: (value: DeviceFingerprint | null) => void;
  setIsGoogleOAuthEnabled: (value: boolean) => void;
  setFormErrorMessage: (value: string | null) => void;
  setFormErrorCode: (value: string | null) => void;
  setLockoutSeconds: React.Dispatch<React.SetStateAction<number | null>>;
  lockoutSeconds: number | null;
  isLoading: boolean;
  showTwoFactor: boolean;
  emailInputRef: React.RefObject<HTMLInputElement>;
  passwordInputRef: React.RefObject<HTMLInputElement>;
}

export const useLoginEffects = ({
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
}: UseLoginEffectsProps) => {
  // Initialize form animation
  useEffect(() => {
    formControls.start('steady');
  }, [formControls, showTwoFactor]);

  // Handle shake animation
  useEffect(() => {
    if (!isShaking) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await formControls.start('shake');
      } finally {
        if (!cancelled) {
          setIsShaking(false);
          formControls.start('steady');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isShaking, formControls, setIsShaking]);

  // Check OAuth provider status
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const { getOAuthStatus } = await import('@/lib/api/auth-client');
        const data = await getOAuthStatus();
        setIsGoogleOAuthEnabled(data.status === 'success' && !!data.user);
      } catch (error) {
        logger.error('Failed to check OAuth status:', error);
        setIsGoogleOAuthEnabled(false);
      }
    };

    checkOAuthStatus();
  }, [setIsGoogleOAuthEnabled]);

  // Check for OAuth errors in URL parameters
  useEffect(() => {
    if (isBrowser()) {
      safeWindow((w) => {
        const urlParams = new URLSearchParams(w.location.search);
        const error = urlParams.get('error');
        const message = urlParams.get('message');

        if (error) {
          const errorMessage = message
            ? decodeURIComponent(message)
            : 'حدث خطأ أثناء تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.';

          setFormErrorMessage(errorMessage || null);
          setFormErrorCode(error);
          setIsShaking(true);
          toast.error(errorMessage, { duration: 5000 });

          // Clean up URL parameters
          const newUrl = w.location.pathname;
          w.history.replaceState({}, '', newUrl);
        }
      }, undefined);
    }
  }, [setFormErrorMessage, setFormErrorCode, setIsShaking]);

  // Get device fingerprint on mount
  useEffect(() => {
    getClientDeviceFingerprint()
      .then(setDeviceFingerprint)
      .catch((error) => logger.error('Failed to get device fingerprint', error));
  }, [setDeviceFingerprint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Submit on Enter (when not in textarea)
      if (e.key === 'Enter' && !isLoading && e.target instanceof HTMLInputElement) {
        const form = e.target.closest('form');
        if (form && !showTwoFactor) {
          form.requestSubmit();
        }
      }
      // Focus email on Alt+E
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        emailInputRef.current?.focus();
      }
      // Focus password on Alt+P
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        passwordInputRef.current?.focus();
      }
    };

    if (isBrowser()) {
      safeWindow((w) => {
        w.addEventListener('keydown', handleKeyPress);
      }, undefined);
      return () => {
        safeWindow((w) => {
          w.removeEventListener('keydown', handleKeyPress);
        }, undefined);
      };
    }
  }, [isLoading, showTwoFactor, emailInputRef, passwordInputRef]);

  // Handle lockout countdown
  useEffect(() => {
    const isFormLocked = lockoutSeconds !== null && lockoutSeconds > 0;
    if (!isFormLocked) {
      return;
    }

    const intervalId = safeWindow(
      (w) =>
        w.setInterval(() => {
          setLockoutSeconds((prev: number | null) => {
            if (prev === null) return null;
            return prev <= 1 ? 0 : prev - 1;
          });
        }, 1000),
      null
    );

    if (!intervalId) return;

    return () => {
      safeWindow((w) => {
        w.clearInterval(intervalId);
      }, undefined);
    };
  }, [lockoutSeconds, setLockoutSeconds]);

  // Handle lockout expiration
  useEffect(() => {
    if (lockoutSeconds === 0) {
      setLockoutSeconds(null);
      setFormErrorMessage(null);
      setFormErrorCode(null);
      toast.info('يمكنك المحاولة الآن.');
    }
  }, [lockoutSeconds, setLockoutSeconds, setFormErrorMessage, setFormErrorCode]);
};

