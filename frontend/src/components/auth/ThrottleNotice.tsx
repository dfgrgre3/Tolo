"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Timer } from "lucide-react";
import type { ThrottleSnapshot } from "@/lib/auth/attempt-throttle";
import { formatCooldownAr } from "@/lib/auth/rate-limit";

/**
 * ThrottleNotice — renders the brute-force friction state for a form:
 * nothing when fresh, a remaining-attempts hint when close to lockout, and
 * a lockout countdown while blocked. Pure presentation over a
 * `ThrottleSnapshot`; all counting lives in `attempt-throttle.ts`.
 */
export default function ThrottleNotice({ snapshot }: { snapshot: ThrottleSnapshot }) {
  if (snapshot.locked) {
    return (
      <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
        <Timer className="h-4 w-4" />
        <AlertTitle className="font-semibold me-2">إيقاف مؤقت للمحاولات</AlertTitle>
        <AlertDescription dir="rtl" className="me-2">
          {`لحماية حسابك من التخمين، أُوقفت المحاولات ${formatCooldownAr(snapshot.remainingMs)}`}
        </AlertDescription>
      </Alert>
    );
  }

  if (snapshot.remainingAttempts <= 2) {
    const hint =
      snapshot.remainingAttempts === 1
        ? "تنبيه: تبقت محاولة واحدة قبل الإيقاف المؤقت"
        : "تنبيه: تبقت محاولتان قبل الإيقاف المؤقت";
    return (
      <Alert className="border-slate-300/50 text-slate-500 dark:text-slate-400 bg-slate-500/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription dir="rtl" className="me-2 text-sm">
          {hint}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
