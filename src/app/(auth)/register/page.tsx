"use client";

import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
          <p className="text-slate-400">انضم إلينا اليوم وابدأ رحلتك</p>
        </div>
        
        <RegisterForm />
        
        <div className="mt-8 text-center text-xs text-slate-500">
           &copy; {new Date().getFullYear()} Thanawy. جميع الحقوق محفوظة.
        </div>
      </div>
    </div>
  );
}
