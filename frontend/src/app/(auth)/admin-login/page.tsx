"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, Lock, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuthContext } from "@/contexts/auth-context";
import { isStaffAdminPanelRole } from "@/lib/auth/admin-panel-roles";
import { sanitizeRedirectPath } from "@/services/auth/navigation";

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

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    adminLogin,
    verify2FA,
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
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
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
      if (result.requires2FA) {
        setRequires2FA(true);
        setUserId2FA(result.userId ?? null);
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
    if (!userId2FA || twoFactorCode.length < 6) return;

    setIsSubmitting(true);
    setErrorStatus(null);

    const result = await verify2FA(userId2FA, twoFactorCode);

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
        {requires2FA ? (
          <form
            onSubmit={handleVerify2FA}
            className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-red-500/10 mb-6 border border-red-500/20">
                <ShieldCheck className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">تأكيد أمني إضافي</h3>
              <p className="text-slate-400 font-medium">أدخل رمز الأمان من تطبيق المصادقة (2FA)</p>
            </div>

            {errorStatus && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="mr-2 font-semibold">خطأ</AlertTitle>
                <AlertDescription dir="rtl" className="mr-2">{errorStatus}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""))}
                autoFocus
                dir="ltr"
                placeholder="000000"
                className="w-full text-center tracking-[0.6em] text-2xl font-black rounded-2xl border border-white/10 bg-white/5 py-6 text-white placeholder:text-slate-600"
              />
              <Button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black shadow-xl shadow-red-500/20 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "تحقق وفتح الصلاحيات"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRequires2FA(false)}
                className="w-full text-slate-500 hover:text-white"
              >
                إلغاء والمحاولة مرة أخرى
              </Button>
            </div>
          </form>
        ) : (
<form
            onSubmit={handleSubmit}
            className="w-full rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-8 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-red-500/10 border border-red-500/20 mb-5">
                <ShieldCheck className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">لوحة التحكم</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
                تسجيل دخول الموظفين والمسؤولين فقط
              </p>
            </div>

            {errorStatus && (
              <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="mr-2 font-semibold">خطأ</AlertTitle>
                <AlertDescription dir="rtl" className="mr-2">{errorStatus}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="admin-email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@tolo.app"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={isSubmitting}
                    dir="ltr"
                    className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    dir="ltr"
                    className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black shadow-xl shadow-red-500/25 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
                العودة لصفحة الطلاب
              </Link>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                Staff Only
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}