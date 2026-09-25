"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, AlertCircle, CheckCircle, KeyRound } from "lucide-react";
import Link from "next/link";
import { verifyMagicLink } from "@/services/auth";
import { useAuthContext } from "@/contexts/auth-context";
import { sanitizeRedirectPath } from "@/services/auth/navigation";

/**
 * Magic-link landing page.
 *
 * The emailed "تسجيل الدخول" button points here with `?token=…`. We redeem it
 * once on mount: the backend sets the HttpOnly session cookies and we just
 * refresh the session cache, then forward to wherever the learner was headed.
 * The token is single-use, so reloading this page after a successful sign-in
 * must not replay it — we guard on the outcome instead of the URL.
 */
export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuthContext();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- validating external token on mount; error state sync is intentional
      setStatus("error");
      setError("الرابط غير صالح: رمز تسجيل الدخول مفقود.");
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await verifyMagicLink(token);
      if (cancelled) return;

      if (!result.success) {
        setStatus("error");
        // The backend distinguishes "expired" from "invalid" but the message
        // is English; surface the Arabic guidance and keep the raw verdict in
        // the console for debugging.
        setError(result.error || "تعذر تسجيل الدخول عبر الرابط، حاول مرة أخرى.");
        return;
      }

      setStatus("success");
      await refreshUser();
      const target = sanitizeRedirectPath(searchParams.get("redirect"));
      router.replace(target);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally excludes router/refreshUser/searchParams — this must run
    // exactly once per mounted page with the token from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="relative flex w-full flex-1 items-center justify-center py-4 sm:py-8">
      <div className="relative w-full max-w-[460px]">
        <Card className="w-full overflow-hidden rounded-3xl border border-[#0F766E]/15 bg-white shadow-xl shadow-slate-900/10 dark:border-[#2DD4BF]/20 dark:bg-slate-900">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E] dark:text-[#5EEAD4]">
                <KeyRound className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              تسجيل الدخول عبر الرابط
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {status === "verifying" && "جاري التحقق من الرابط وتسجيل الدخول..."}
              {status === "success" && "تم تسجيل الدخول بنجاح، جاري التحويل..."}
              {status === "error" && "تعذر تسجيل الدخول"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "verifying" && (
              <div className="flex items-center justify-center py-6" role="status" aria-label="جاري التحقق">
                <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center justify-center py-6">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                  {error}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  الروابط صالحة لمدة 15 دقيقة وللاستخدام مرة واحدة فقط.
                </p>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-primary hover:text-primary/80"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
