'use client';

import { useState } from 'react';

export function useCaptcha(failedAttempts: number) {
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const checkCaptchaRequirement = () => {
    // Require CAPTCHA after 3 failed attempts
    if (failedAttempts >= 3) {
      setRequiresCaptcha(true);
      return true;
    }
    return false;
  };

  const resetCaptcha = () => {
    setRequiresCaptcha(false);
    setCaptchaToken(null);
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  return {
    requiresCaptcha,
    captchaToken,
    setRequiresCaptcha,
    resetCaptcha,
    handleCaptchaVerify,
    checkCaptchaRequirement,
  };
}

