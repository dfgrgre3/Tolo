"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle, Chrome, Apple, KeyRound, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { useAuthContext, type LoginResponse } from "@/contexts/auth-context";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuthContext();
  const registered = searchParams.get("registered") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTicket, setMfaTicket] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillText("ToloAuthDeviceFingerprint", 2, 15);
      }
      const dataURL = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        hash = (hash << 5) - hash + dataURL.charCodeAt(i);
        hash = hash & hash;
      }
      setFingerprint(Math.abs(hash).toString(16));
    }
  }, []);

  const getSafeRedirect = () => {
    const redirect = searchParams.get("redirect");
    return redirect?.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/dashboard";
  };

  const completeLogin = async () => {
    const refreshed = await refreshUser();
    if (!refreshed) {
      throw new Error("تعذر تحميل بيانات المستخدم بعد تسجيل الدخول");
    }
    router.push(getSafeRedirect());
    router.refresh();
  };

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError || err instanceof Error ? err.message : fallback;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);
    setError(null);

    const deviceName = typeof window !== "undefined"
      ? `${navigator.platform} (${navigator.language})`
      : "Unknown Device";

    try {
      const responseData = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
        rememberMe,
        deviceName,
        fingerprint,
      });

      if (responseData.mfaRequired) {
        setMfaRequired(true);
        setMfaTicket(responseData.ticket);
        setIsLoading(false);
        return;
      }

      await completeLogin();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "حدث خطأ غير متوقع أثناء تسجيل الدخول"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      setError("يرجى إدخال رمز التحقق ثنائي العامل");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post("/auth/mfa/verify", { ticket: mfaTicket, code: mfaCode });
      await completeLogin();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "فشل التحقق من الهوية"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsLoading(true);
    setError(null);
    try {
      const { redirectUrl } = await apiClient.get<{ redirectUrl: string }>(`/auth/social/${provider}`);
      if (!redirectUrl || !/^https:\/\//i.test(redirectUrl)) {
        throw new Error("رابط تسجيل الدخول الاجتماعي غير صالح");
      }
      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "تعذر بدء تسجيل الدخول الاجتماعي"));
      setIsLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">التحقق ثنائي العامل</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">أدخل رمز الـ OTP المكون من 6 أرقام لتأمين حسابك</CardDescription>
        </CardHeader>
        <form onSubmit={handleMfaSubmit}>
          <CardContent className="grid gap-5">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold mr-2">خطأ في التحقق</AlertTitle>
                <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="mfaCode" className="text-slate-700 dark:text-slate-300 font-medium">رمز التحقق</Label>
              <Input
                id="mfaCode"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                disabled={isLoading}
                dir="ltr"
                maxLength={9}
                className="bg-white dark:bg-slate-950 text-center tracking-widest text-lg font-bold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "تأكيد الرمز"
              )}
            </Button>
            <Button variant="ghost" className="w-full text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => setMfaRequired(false)}>
              العودة إلى تسجيل الدخول
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">تسجيل الدخول</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">أدخل بيانات الاعتماد الخاصة بك للدخول إلى المنصة</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-5">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold mr-2">خطأ في تسجيل الدخول</AlertTitle>
              <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
            </Alert>
          )}
          {registered && !error && (
            <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="font-semibold mr-2">تم إنشاء الحساب</AlertTitle>
              <AlertDescription dir="rtl" className="mr-2">تم إنشاء حسابك بنجاح. سجّل الدخول للمتابعة.</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                dir="ltr"
                className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كلمة المرور</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                dir="ltr"
                className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse justify-start">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              disabled={isLoading}
              className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="rememberMe" className="text-xs text-slate-500 dark:text-slate-400 select-none cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300">
              تذكرني على هذا الجهاز
            </Label>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium rounded-full">أو تسجيل الدخول بواسطة</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <Chrome className="ml-2 h-4 w-4 text-red-500" /> Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("apple")}
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <Apple className="ml-2 h-4 w-4 text-slate-900 dark:text-slate-200" /> Apple
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
          <div className="text-sm text-center text-slate-500 dark:text-slate-400">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
              إنشاء حساب جديد
            </Link>
          </div>
          <div className="text-center">
            <Link
              href="/admin-login"
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary font-semibold transition-colors"
            >
              دخول الموظفين والمسؤولين
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
