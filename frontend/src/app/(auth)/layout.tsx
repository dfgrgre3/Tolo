import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" data-auth-root className="relative min-h-screen w-full overflow-hidden bg-[#f5f7fa] py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,118,110,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,0.04)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-center">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Tolo الصفحة الرئيسية"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f766e] shadow-md shadow-[#0f766e]/20 dark:bg-[#115e59]">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-wide text-slate-900 dark:text-white">
              Tolo
            </span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
