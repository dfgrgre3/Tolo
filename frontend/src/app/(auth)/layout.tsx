import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[90vh] w-full bg-slate-50 dark:bg-slate-950 py-10 flex items-center justify-center overflow-hidden">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-orange-500/10 blur-[120px]" />

      <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Tolo الصفحة الرئيسية"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Tolo
            </span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
