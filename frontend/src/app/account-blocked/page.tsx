"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/auth-context";

/**
 * Shown when the backend rejects an existing session because the account
 * status does not allow authentication (AuthStatus === "blocked"). This is
 * distinct from "anonymous" — the visitor has proof of identity, but the
 * account itself is suspended/locked, so it must not funnel into the normal
 * /login redirect.
 */
export default function AccountBlockedPage() {
  const { error, logout } = useAuthContext();

  return (
    <div className="w-full flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-[460px] border border-red-200/50 dark:border-red-900/40 shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            تم تقييد الوصول إلى هذا الحساب
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {error ?? "هذا الحساب غير مسموح له بتسجيل الدخول حاليًا. تواصل مع الدعم الفني لمزيد من المعلومات."}
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button asChild className="w-full">
            <Link href="/contact">التواصل مع الدعم</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            تسجيل الخروج
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
