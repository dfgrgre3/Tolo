"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, Mail, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { verifyEmail, resendVerification } from "@/services/auth";
import { useAuthContext } from "@/contexts/auth-context";
import ThrottleNotice from "@/components/auth/ThrottleNotice";
import {
  getThrottle,
  recordFailure,
  recordSuccess,
  type ThrottleSnapshot,
} from "@/lib/auth/attempt-throttle";
import { formatCooldownAr } from "@/lib/auth/rate-limit";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";

const VERIFY_RESEND_KEY = "resend:verify-email";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { refreshUser } = useAuthContext();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [codeThrottle, setCodeThrottle] = useState<ThrottleSnapshot>(() =>
    getThrottle("verify-email")
  );
  // Server-directed resend delay, persisted in the cooldown store: unlike the
  // old in-memory counter, a reload mid-cooldown resumes the wait instead of
  // letting the user fire another request immediately.
  const resendCooldown = useResendCooldown(VERIFY_RESEND_KEY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }

    const gate = getThrottle("verify-email");
    setCodeThrottle(gate);
    if (gate.locked) {
      setError(`تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(gate.remainingMs)}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await verifyEmail(code);

    if (!result.success) {
      const next = recordFailure("verify-email", result.retryAfterMs);
      setCodeThrottle(next);
      setError(
        result.rateLimited && result.retryAfterMs
          ? `محاولات كثيرة جداً. حاول مجدداً ${formatCooldownAr(result.retryAfterMs)}`
          : next.locked
            ? `تم إيقاف المحاولات مؤقتاً. حاول مجدداً ${formatCooldownAr(next.remainingMs)}`
            : result.error || "رمز التحقق غير صحيح أو منتهي الصلاحية"
      );
      setIsLoading(false);
      return;
    }

    setCodeThrottle(recordSuccess("verify-email"));
    await refreshUser();

    setSuccess("تم تأكيد بريدك الإلكتروني بنجاح! سيتم تحويلك للوحة التحكم...");
    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
    setIsLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown.cooling) return;
    setIsResending(true);
    setError(null);
    setSuccess(null);

    const result = await resendVerification();

    if (!result.success) {
      // A 429 carries the server's own wait — adopt it as the cooldown so
      // the button re-enables exactly when the server will accept a retry.
      if (result.rateLimited && result.retryAfterMs) {
        resendCooldown.start(result.retryAfterMs);
        setError(`طلبات كثيرة جداً. يمكنك المحاولة ${formatCooldownAr(result.retryAfterMs)}`);
      } else {
        setError(result.error || "فشل إعادة إرسال الرمز");
      }
    } else {
      setSuccess("تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.");
      resendCooldown.start(result.cooldownMs);
    }
    setIsResending(false);
  };

  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="w-full max-w-[460px] mx-auto">
        <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Mail className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">تأكيد البريد الإلكتروني</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-5">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold me-2">خطأ</AlertTitle>
                  <AlertDescription dir="rtl" className="me-2">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="font-semibold me-2">تأكيد العملية</AlertTitle>
                  <AlertDescription dir="rtl" className="me-2">{success}</AlertDescription>
                </Alert>
              )}
              <ThrottleNotice snapshot={codeThrottle} />
              <div className="grid gap-2">
                <Label htmlFor="code" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">رمز التحقق (OTP)</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  disabled={isLoading}
                  dir="ltr"
                  maxLength={6}
                  className="bg-white dark:bg-slate-950 text-center tracking-[0.5em] text-2xl font-bold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading || !!success || codeThrottle.locked}>
                {isLoading ? (
                  <>
                    <LoaderCircle className="ms-2 h-4 w-4" />
                    جاري التأكيد...
                  </>
                ) : (
                  "تأكيد الحساب"
                )}
              </Button>
              <div className="flex justify-between w-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || !!success || resendCooldown.cooling}
                  className="text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {isResending
                    ? "جاري الإرسال..."
                    : resendCooldown.cooling
                      ? `إعادة الإرسال ${formatCooldownAr(resendCooldown.remainingMs)}`
                      : "إعادة إرسال الرمز"}
                </button>
                <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
