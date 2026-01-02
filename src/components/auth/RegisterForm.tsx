"use client";

import { useRegister } from "@/hooks/use-register";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterForm() {
  const { form, onSubmit, isLoading } = useRegister();
  const { register, formState: { errors } } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
      {/* Name */}
      <div className="space-y-2 text-right">
        <label htmlFor="name" className="text-sm font-medium text-slate-200">
          الاسم الكامل
        </label>
        <input
          {...register("name")}
          id="name"
          type="text"
          placeholder="الاسم"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all text-right"
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

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

      {/* Confirm Password */}
      <div className="space-y-2 text-right">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
          تأكيد كلمة المرور
        </label>
        <input
          {...register("confirmPassword")}
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all text-right"
        />
        {errors.confirmPassword && (
           <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Terms */}
      <div className="space-y-2">
      <label className="flex items-start gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors text-right">
          <input
            {...register("acceptTerms")}
            type="checkbox"
            className="w-4 h-4 mt-1 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm">
             أوافق على{" "}
             <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">الشروط والأحكام</Link>
             {" "}و{" "}
             <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">سياسة الخصوصية</Link>
          </span>
        </label>
        {errors.acceptTerms && (
           <p className="text-sm text-red-400 text-right">{errors.acceptTerms.message}</p>
        )}
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
          "إنشاء حساب"
        )}
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-400 mt-4">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
