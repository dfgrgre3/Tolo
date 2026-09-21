"use client";

import React from "react";
import LoginCredentialsStep from "./LoginCredentialsStep";
import MfaVerifyStep from "./MfaVerifyStep";
import ThrottleNotice from "./ThrottleNotice";
import { useLoginForm } from "./useLoginForm";

/**
 * LoginForm — orchestrates the two-step sign-in flow (credentials, then an
 * optional MFA challenge). Presentation lives in `LoginCredentialsStep` /
 * `MfaVerifyStep` / `SocialLoginButtons`; state and the calls into
 * `login-service` live in `useLoginForm`.
 */
export default function LoginForm() {
  const {
    registered,
    sessionExpired,
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    mfaCode,
    setMfaCode,
    mfaChallenge,
    magicLinkMode,
    magicLinkSent,
    error,
    needsVerification,
    isLoading,
    loginThrottle,
    mfaThrottle,
    handleSubmit,
    handleMfaSubmit,
    cancelMfa,
    handleSocialLogin,
    handleMagicLinkRequest,
    toggleMagicLinkMode,
  } = useLoginForm();

  if (mfaChallenge !== null) {
    return (
      <MfaVerifyStep
        code={mfaCode}
        onCodeChange={setMfaCode}
        error={error}
        isLoading={isLoading}
        onSubmit={handleMfaSubmit}
        onCancel={cancelMfa}
        submitDisabled={mfaThrottle.locked}
        noticeSlot={<ThrottleNotice snapshot={mfaThrottle} />}
      />
    );
  }

  return (
    <LoginCredentialsStep
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      error={error}
      needsVerification={needsVerification}
      isLoading={isLoading}
      registered={registered}
      sessionExpired={sessionExpired}
      onSubmit={handleSubmit}
      onSocialLogin={handleSocialLogin}
      magicLinkMode={magicLinkMode}
      magicLinkSent={magicLinkSent}
      onMagicLinkRequest={handleMagicLinkRequest}
      onToggleMagicLinkMode={toggleMagicLinkMode}
      submitDisabled={loginThrottle.locked}
      noticeSlot={<ThrottleNotice snapshot={loginThrottle} />}
    />
  );
}
