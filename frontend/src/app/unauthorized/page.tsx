"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ShieldAlert, ArrowLeft, LogOut, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center animate-in fade-in duration-500">
      <div className="mb-6 rounded-full border border-amber-500/30 bg-amber-500/10 p-5 text-amber-500 shadow-lg shadow-amber-500/5 animate-pulse">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Access Denied / غير مصرح بالدخول
      </h1>
      <p className="mb-4 text-lg text-muted-foreground">
        Your account ({user?.email || 'Student Account'}) does not have permission to view this page.
      </p>
      <p className="mb-8 text-sm text-amber-500/90 max-w-md bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
        ليس لديك الصلاحيات الكافية للوصول لهذه الصفحة. يرجى العودة للرئيسية أو تسجيل الدخول بحساب آخر.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground px-6 py-3 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
        >
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </Link>
        
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background hover:bg-accent text-foreground px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          تسجيل الخروج / تبديل الحساب
        </button>
      </div>
    </div>
  );
}

