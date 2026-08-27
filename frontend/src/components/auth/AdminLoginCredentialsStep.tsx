"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, Lock, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

interface AdminLoginCredentialsStepProps {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  errorStatus: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** First step of the admin/staff login flow — identifier + password. */
export default function AdminLoginCredentialsStep({
  identifier,
  onIdentifierChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  errorStatus,
  isSubmitting,
  onSubmit,
}: AdminLoginCredentialsStepProps) {
  return (
    <form
      onSubmit={onSubmit}
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
          <AlertTitle className="me-2 font-semibold">خطأ</AlertTitle>
          <AlertDescription dir="rtl" className="me-2">{errorStatus}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="admin-email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
            البريد الإلكتروني
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
              <Mail className="h-4 w-4" />
            </span>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@tolo.app"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              required
              disabled={isSubmitting}
              dir="ltr"
              className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="admin-password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
            كلمة المرور
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
              disabled={isSubmitting}
              dir="ltr"
              className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleShowPassword}
              className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
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
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              جاري التحقق...
            </>
          ) : (
            <>
              <CheckCircle2 className="ms-2 h-4 w-4" />
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
  );
}
