"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api-client";
import { useAuthContext } from "@/contexts/auth-context";
import { getDeviceFingerprint } from "@/lib/auth/device-fingerprint";
import { login, verifyMfa, getSocialLoginUrl } from "@/services/auth/login-service";
import { sanitizeRedirectPath } from "@/services/auth/navigation";
import {
  getThrottle,
  recordFailure,
  recordSuccess,
  type ThrottleSnapshot,
} from "@/lib/auth/attempt-throttle";
import { formatCooldownAr } from "@/lib/auth/rate-limit";

const LAST_EMAIL_KEY = "thanawy:last-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readLastEmail(): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

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
  const [email, setEmail] = useState(readLastEmail);
  const [password, setPassword] = useState("");
  // Default ON: returning on the same device skips re-typing credentials
  // for 90 days instead of 30. Explicit sign-out still clears everything.
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // UX-layer brute-force friction (see attempt-throttle.ts — the backend
  // 429 is the real boundary). Snapshots refresh on every submit outcome;
  // `humanKey` remounts HumanCheck after each solve.
  const [loginThrottle, setLoginThrottle] = useState<ThrottleSnapshot>(() => getThrottle("login"));
  const [mfaThrottle, setMfaThrottle] = useState<ThrottleSnapshot>(() => getThrottle("mfa"));
  const [humanKey, setHumanKey] = useState(0);

  /** Human verification solved: clear login fails and remount the widget. */
  const markHumanSolved = () => {
    setLoginThrottle(recordSuccess("login"));
    setHumanKey((k) => k + 1);
  };

  const completeLogin = async () => {
    const targetPath = sanitizeRedirectPath(searchParams.get("redirect"));
    const refreshed = await refreshUser();
    if (!refreshed) {
      setError("تعذر تحميل بيانات المستخدم بعد تسجيل الدخول");
      return;
    }
    router.push(targetPath);
    router.refresh();
  };

  // Landing from the backend OAuth callback (provider -> backend -> 302
  // here with ?social=success|error). The session cookies are already set;
  // just hydrate the user, toast, and clean the URL. Runs once on mount
  // (deps []) — the set-state-in-effect warning below is benign one-shot
  // consumption of a navigation param, not a cascading render.
  useEffect(() => {
    const social = searchParams.get("social");
    if (!social) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("social");
    window.history.replaceState(null, "", url.toString());
    if (social === "success") {
      toast.success("تم تسجيل الدخول بنجاح");
      void completeLogin();
    } else {
      setError("فشل تسجيل الدخول الاجتماعي — حاول مرة أخرى");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const gate = getThrottle("login");
    setLoginThrottle(gate);
    if (gate.locked) {
      setError(`تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(gate.remainingMs)}`);
      return;
    }
    if (gate.captchaRequired) {
      setError("يرجى إتمام التحقق البشري أولاً");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login({
      email: trimmedEmail,
      password,
      rememberMe,
      // Computed on demand (and memoized in localStorage) so the value is
      // always present on the first submit.
      fingerprint: getDeviceFingerprint(),
    });

    if (result.requiresMfa) {
      setLoginThrottle(recordSuccess("login"));
      setMfaChallenge(result.challengeId ?? "");
      setIsLoading(false);
      return;
    }

    if (!result.success) {
      const next = recordFailure("login", result.retryAfterMs);
      setLoginThrottle(next);
      setError(
        result.rateLimited && result.retryAfterMs
          ? `محاولات كثيرة جداً. حاول مجدداً ${formatCooldownAr(result.retryAfterMs)}`
          : next.locked
            ? `تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(next.remainingMs)}`
            : result.error ?? "حدث خطأ غير متوقع أثناء تسجيل الدخول"
      );
      setIsLoading(false);
      return;
    }

    setLoginThrottle(recordSuccess("login"));
    try {
      window.localStorage.setItem(LAST_EMAIL_KEY, trimmedEmail);
    } catch {
      // Prefill is convenience only — never fail login over it.
    }
    await completeLogin();
    setIsLoading(false);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!mfaCode) {
      setError("يرجى إدخال رمز التحقق ثنائي العامل");
      return;
    }

    const gate = getThrottle("mfa");
    setMfaThrottle(gate);
    if (gate.locked) {
      setError(`تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(gate.remainingMs)}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await verifyMfa(mfaChallenge ?? "", mfaCode, rememberMe);

    if (!result.success) {
      const next = recordFailure("mfa", result.retryAfterMs);
      setMfaThrottle(next);
      setError(
        result.rateLimited && result.retryAfterMs
          ? `محاولات كثيرة جداً. حاول مجدداً ${formatCooldownAr(result.retryAfterMs)}`
          : next.locked
            ? `تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(next.remainingMs)}`
            : result.error ?? "فشل التحقق من الهوية"
      );
      setIsLoading(false);
      return;
    }

    setMfaThrottle(recordSuccess("mfa"));
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
    loginThrottle,
    mfaThrottle,
    humanKey,
    markHumanSolved,
    handleSubmit,
    handleMfaSubmit,
    cancelMfa,
    handleSocialLogin,
  };
}
