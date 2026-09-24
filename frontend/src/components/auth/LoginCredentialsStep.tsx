"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, AlertCircle, CheckCircle, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import SocialLoginButtons from "./SocialLoginButtons";
import PasskeyLoginButton from "./PasskeyLoginButton";
import LoginCredentialsFields from "./LoginCredentialsFields";

interface LoginCredentialsStepProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  error: string | null;
  /** Backend rejected the login as unverified — show a verify-email CTA. */
  needsVerification?: boolean;
  isLoading: boolean;
  registered: boolean;
  sessionExpired: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSocialLogin: (provider: "google" | "apple") => void;
  /** When true, the form asks only for an email and sends a sign-in link. */
  magicLinkMode?: boolean;
  /** A link was requested (or appeared to be) — show the confirmation state. */
  magicLinkSent?: boolean;
  onMagicLinkRequest?: (e: React.FormEvent) => void;
  onToggleMagicLinkMode?: () => void;
  /** Disables submit while a throttle lockout is active. */
  submitDisabled?: boolean;
  /** Renders lockout / remaining-attempts state above the fields. */
  noticeSlot?: React.ReactNode;
}

/**
 * First step of `LoginForm` — email/password credentials + social sign-in.
 * Field inputs live in `LoginCredentialsFields`.
 */
export default function LoginCredentialsStep({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  error,
  needsVerification = false,
  isLoading,
  registered,
  sessionExpired,
  onSubmit,
  onSocialLogin,
  magicLinkMode = false,
  magicLinkSent = false,
  onMagicLinkRequest,
  onToggleMagicLinkMode,
  submitDisabled = false,
  noticeSlot,
}: LoginCredentialsStepProps) {
  return (
    <Card className="w-full overflow-hidden rounded-3xl border border-[#0F766E]/15 bg-white shadow-xl shadow-slate-900/10 dark:border-[#2DD4BF]/20 dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E] dark:text-[#5EEAD4]">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">تسجيل الدخول</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">أدخل بيانات الاعتماد الخاصة بك للدخول إلى المنصة</CardDescription>
      </CardHeader>
      <form onSubmit={magicLinkMode ? onMagicLinkRequest : onSubmit} aria-busy={isLoading}>
        <CardContent className="grid gap-5" aria-live="polite">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold me-2">خطأ في تسجيل الدخول</AlertTitle>
              <AlertDescription dir="rtl" className="me-2">
                {error}
                {needsVerification && (
                  <>
                    {" "}
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                      className="font-bold underline underline-offset-4 hover:opacity-80"
                    >
                      الانتقال إلى صفحة التفعيل
                    </Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {sessionExpired && !error && (
            <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold me-2">انتهت الجلسة</AlertTitle>
              <AlertDescription dir="rtl" className="me-2">انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.</AlertDescription>
            </Alert>
          )}
          {registered && !error && (
            <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="font-semibold me-2">تم إنشاء الحساب</AlertTitle>
              <AlertDescription dir="rtl" className="me-2">
                تم إنشاء حسابك بنجاح. أدخل رمز التفعيل المرسل إلى بريدك في{" "}
                <Link href="/verify-email" className="font-bold underline underline-offset-4 hover:opacity-80">
                  صفحة التفعيل
                </Link>{" "}
                ثم سجّل الدخول.
              </AlertDescription>
            </Alert>
          )}
          {magicLinkSent && !error && (
            <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="font-semibold me-2">تم إرسال الرابط</AlertTitle>
              <AlertDescription dir="rtl" className="me-2">
                إذا كان بريدك مسجلاً لدينا، ستصلك رسالة تحتوي على رابط تسجيل دخول صالح لمدة 15 دقيقة.
              </AlertDescription>
            </Alert>
          )}

          {magicLinkMode ? (
            <div className="grid gap-2">
              <label htmlFor="magic-link-email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                البريد الإلكتروني
              </label>
              <input
                id="magic-link-email"
                name="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={isLoading}
                required
                className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>
          ) : (
            <LoginCredentialsFields
              email={email}
              onEmailChange={onEmailChange}
              password={password}
              onPasswordChange={onPasswordChange}
              rememberMe={rememberMe}
              onRememberMeChange={onRememberMeChange}
              isLoading={isLoading}
            />
          )}

          {noticeSlot}

          <SocialLoginButtons isLoading={isLoading} onSelect={onSocialLogin} />
          {!magicLinkMode && <PasskeyLoginButton />}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button
            type="submit"
            className="h-11 w-full bg-[#0F766E] text-white font-bold shadow-lg shadow-[#0F766E]/20 hover:bg-[#115E59]"
            disabled={isLoading || submitDisabled}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="ms-2 h-4 w-4" />
                جاري التحقق...
              </>
            ) : magicLinkMode ? (
              <>
                <Mail className="ms-2 h-4 w-4" />
                إرسال رابط تسجيل الدخول
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
          <button
            type="button"
            onClick={onToggleMagicLinkMode}
            disabled={isLoading}
            className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {magicLinkMode
              ? "تسجيل الدخول بكلمة المرور"
              : "تسجيل الدخول عبر رابط سحري"}
          </button>
          <div className="text-sm text-center text-slate-500 dark:text-slate-400">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
              إنشاء حساب جديد
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
