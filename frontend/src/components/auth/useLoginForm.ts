"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/api-client";
import { useAuthContext } from "@/contexts/auth-context";
import { getDeviceFingerprint } from "@/lib/auth/device-fingerprint";
import { login, verifyMfa, getSocialLoginUrl } from "@/services/auth/login-service";
import { sanitizeRedirectPath } from "@/services/auth/navigation";

function toSocialLoginError(err: unknown): string {
  return err instanceof ApiError || err instanceof Error
    ? err.message
    : "تعذر بدء تسجيل الدخول الاجتماعي";
}

/**
 * useLoginForm — owns the two-step sign-in flow's state and the calls into
 * `login-service`. Extracted from `LoginForm` so the component stays focused
 * on composing `LoginCredentialsStep` / `MfaVerifyStep`.
 */
export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuthContext();
  const registered = searchParams.get("registered") === "true";
  const sessionExpired = searchParams.get("error") === "session_expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const completeLogin = async () => {
    const targetPath = sanitizeRedirectPath(searchParams.get("redirect"));
    const refreshed = await refreshUser();
    if (!refreshed) {
      setError("تعذر تحميل بيانات المستخدم بعد تسجيل الدخول");
      return;
    }
    router.refresh();
    router.push(targetPath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login({
      identifier: email,
      password,
      rememberMe,
      // Computed on demand (and memoized in localStorage) so the value is
      // always present on the first submit.
      fingerprint: getDeviceFingerprint(),
    });

    if (result.requiresMfa) {
      setMfaChallenge(result.challenge ?? "");
      setIsLoading(false);
      return;
    }

    if (!result.success) {
      setError(result.error ?? "حدث خطأ غير متوقع أثناء تسجيل الدخول");
      setIsLoading(false);
      return;
    }

    await completeLogin();
    setIsLoading(false);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      setError("يرجى إدخال رمز التحقق ثنائي العامل");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await verifyMfa(mfaChallenge ?? "", mfaCode);

    if (!result.success) {
      setError(result.error ?? "فشل التحقق من الهوية");
      setIsLoading(false);
      return;
    }

    await completeLogin();
    setIsLoading(false);
  };

  /** Leaves the MFA step and returns to the credentials form. */
  const cancelMfa = () => {
    setMfaChallenge(null);
    setMfaCode("");
    setError(null);
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsLoading(true);
    setError(null);
    try {
      window.location.assign(await getSocialLoginUrl(provider));
    } catch (err: unknown) {
      setError(toSocialLoginError(err));
      setIsLoading(false);
    }
  };

  return {
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
    error,
    isLoading,
    handleSubmit,
    handleMfaSubmit,
    cancelMfa,
    handleSocialLogin,
  };
}
