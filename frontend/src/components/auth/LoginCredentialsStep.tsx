"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, CheckCircle, KeyRound, Mail, Lock } from "lucide-react";
import Link from "next/link";
import SocialLoginButtons from "./SocialLoginButtons";

interface LoginCredentialsStepProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  error: string | null;
  isLoading: boolean;
  registered: boolean;
  sessionExpired: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSocialLogin: (provider: "google" | "apple") => void;
}

/** First step of `LoginForm` — email/password credentials + social sign-in. */
export default function LoginCredentialsStep({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  error,
  isLoading,
  registered,
  sessionExpired,
  onSubmit,
  onSocialLogin,
}: LoginCredentialsStepProps) {
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
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-5">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold mr-2">خطأ في تسجيل الدخول</AlertTitle>
              <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
            </Alert>
          )}
          {sessionExpired && !error && (
            <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold mr-2">انتهت الجلسة</AlertTitle>
              <AlertDescription dir="rtl" className="mr-2">انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.</AlertDescription>
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
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
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
              onCheckedChange={(checked) => onRememberMeChange(!!checked)}
              disabled={isLoading}
              className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="rememberMe" className="text-xs text-slate-500 dark:text-slate-400 select-none cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300">
              تذكرني على هذا الجهاز
            </Label>
          </div>

          <SocialLoginButtons isLoading={isLoading} onSelect={onSocialLogin} />
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
