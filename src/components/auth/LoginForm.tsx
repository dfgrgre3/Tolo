"use client";

import { useLogin } from "@/hooks/use-login";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginForm() {
  const { form, onSubmit, isLoading, showTwoFactor, loginAttemptId } = useLogin();
  const { register, formState: { errors } } = form;

  if (showTwoFactor) {
      // Simple 2FA placeholder - ideally this would be a separate form or component
      // For now, redirecting user conceptually or we can handle it here if we extended useLogin to handle 2FA submit
      return (
          <div className="text-center p-6 bg-white/5 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-4">التحقق بخطوتين</h3>
              <p className="text-slate-300 mb-4">تم إرسال رمز التحقق. (هذه الميزة تتطلب نموذج تحقق منفصل)</p>
               {/* This requires extending the hook and UI to handle code input */}
               {/* Since the user asked for LoginForm specifically using hooks */}
          </div>
      );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
      {/* Email */}
      <div className="space-y-2 text-right">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          البريد الإلكتروني
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          placeholder="name@example.com"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all text-right"
        />
        {errors.email && (
          <p className="text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2 text-right">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          كلمة المرور
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          placeholder="••••••••"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all text-right"
        />
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Options */}
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
          <input
            {...register("rememberMe")}
            type="checkbox"
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          تذكرني
        </label>
        <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          نسيت كلمة المرور؟
        </Link>
      </div>

      {/* Global Error */}
      {errors.root && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
          {errors.root.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التحميل...
          </>
        ) : (
          "تسجيل الدخول"
        )}
      </button>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-400 mt-4">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          إنشاء حساب جديد
        </Link>
      </p>
    </form>
  );
}
