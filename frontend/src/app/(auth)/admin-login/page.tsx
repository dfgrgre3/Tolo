"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { isStaffAdminPanelRole } from "@/lib/auth/admin-panel-roles";
import { sanitizeRedirectPath } from "@/services/auth/navigation";
import AdminLoginCredentialsStep from "@/components/auth/AdminLoginCredentialsStep";
import AdminMfaStep from "@/components/auth/AdminMfaStep";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}

/**
 * AdminLoginContent — orchestrates the two-step staff sign-in flow
 * (credentials, then an optional MFA challenge). Presentation lives in
 * `AdminLoginCredentialsStep` / `AdminMfaStep` (mirrors the LoginForm /
 * LoginCredentialsStep / MfaVerifyStep split).
 */
function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    adminLogin,
    verifyMfa,
    isAuthenticated,
    user,
    isLoading: isAuthLoading,
  } = useAuthContext();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // 2FA state
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const redirectUrl = sanitizeRedirectPath(searchParams.get("redirect"), "/admin");

  const redirectAfterLogin = (target: string) => {
    router.replace(target);
    router.refresh();
  };

  // If already logged in as staff, go straight to the panel.
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && isStaffAdminPanelRole(user?.role)) {
      redirectAfterLogin(redirectUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, user, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorStatus("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (isAuthLoading || (isAuthenticated && isStaffAdminPanelRole(user?.role))) {
      return;
    }

    setIsSubmitting(true);
    setErrorStatus(null);

    const result = await adminLogin(identifier.trim().toLowerCase(), password, true);

    if (!result.success) {
      if (result.requiresMfa) {
        setRequiresMfa(true);
        setMfaChallengeId(result.challengeId ?? null);
      } else {
        setErrorStatus(result.error || "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
      }
      setIsSubmitting(false);
      return;
    }

    // Success handled by the useEffect above (isAuthenticated becomes true).
    setIsSubmitting(false);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallengeId || twoFactorCode.length < 6) return;

    setIsSubmitting(true);
    setErrorStatus(null);

    const result = await verifyMfa(mfaChallengeId, twoFactorCode);

    if (!result.success) {
      setErrorStatus(result.error || "رمز التحقق غير صحيح");
      setIsSubmitting(false);
      return;
    }

    // Success handled by the useEffect above.
    setIsSubmitting(false);
  };

  return (
    <div className="w-full flex items-center justify-center py-8">
      <div className="w-full max-w-[460px] mx-auto">
        {requiresMfa ? (
          <AdminMfaStep
            code={twoFactorCode}
            onCodeChange={setTwoFactorCode}
            errorStatus={errorStatus}
            isSubmitting={isSubmitting}
            onSubmit={handleVerify2FA}
            onCancel={() => setRequiresMfa(false)}
          />
        ) : (
          <AdminLoginCredentialsStep
            identifier={identifier}
            onIdentifierChange={setIdentifier}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword((s) => !s)}
            errorStatus={errorStatus}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
