"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginCredentialsFieldsProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isLoading: boolean;
  emailError?: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email / password / remember-me fields for `LoginCredentialsStep`. */
export default function LoginCredentialsFields({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  isLoading,
  emailError,
}: LoginCredentialsFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const emailErrorId = useId();

  const isEmailInvalid =
    (emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email)) || !!emailError;
  const emailErrorMessage = emailError ?? "يرجى إدخال بريد إلكتروني صحيح";

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
        <div className="relative">
          <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            required
            disabled={isLoading}
            dir="ltr"
            autoFocus
            aria-invalid={isEmailInvalid}
            aria-describedby={isEmailInvalid ? emailErrorId : undefined}
            className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/50"
          />
        </div>
        {isEmailInvalid && (
          <p id={emailErrorId} className="text-xs text-red-500 dark:text-red-400" role="alert">
            {emailErrorMessage}
          </p>
        )}
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
          <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            disabled={isLoading}
            dir="ltr"
            className="bg-white dark:bg-slate-950 ps-10 pe-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={isLoading}
            tabIndex={-1}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
    </>
  );
}
