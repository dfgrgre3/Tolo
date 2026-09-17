"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, KeyRound } from "lucide-react";
import { resetPassword } from "@/services/auth";
import ResetPasswordFields from "@/components/auth/ResetPasswordFields";
import { getPasswordPolicyError } from "@/lib/auth/password-policy";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The reset token travels as ?token= (email link) or, when the user came
  // through the in-app verify-code step, as the HttpOnly `reset_session`
  // cookie — in which case the service omits it and the backend reads the
  // cookie. Either way the service call matches ResetPasswordRequest.
  const resetToken = searchParams.get("token") ?? undefined;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("يرجى ملء جميع الحقول");
      return;
    }

    const policyError = getPasswordPolicyError(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await resetPassword(resetToken, newPassword);

    if (!result.success) {
      setError(result.error || "فشل إعادة تعيين كلمة المرور");
      setIsLoading(false);
      return;
    }

    setSuccess("تم تعيين كلمة المرور بنجاح. سيتم تحويلك لصفحة تسجيل الدخول...");
    setTimeout(() => {
      router.push("/login");
    }, 3000);
    setIsLoading(false);
  };

  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="w-full max-w-[460px] mx-auto">
        <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">تعيين كلمة المرور</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">أدخل كلمة المرور الجديدة لحسابك</CardDescription>
          </CardHeader>
          <ResetPasswordFields
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            error={error}
            success={success}
            isLoading={isLoading}
            hasToken={true}
            onSubmit={handleSubmit}
          />
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-6">
          <LoaderCircle className="h-6 w-6 text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
