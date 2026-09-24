"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, ShieldCheck, AlertCircle } from "lucide-react";

/**
 * Length of a TOTP code; backup recovery codes are longer. The login-service
 * validator accepts exactly `^\d{6}$` or `^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$`
 * (9 chars), so anything longer can never pass and would only hide a typo
 * until submit — cap the input to the real maximum.
 */
const MFA_CODE_MAX_LENGTH = 9;

interface MfaVerifyStepProps {
  code: string;
  onCodeChange: (value: string) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  /** Disables submit while a throttle lockout is active. */
  submitDisabled?: boolean;
  /** Renders lockout / remaining-attempts state above the field. */
  noticeSlot?: React.ReactNode;
}

/** Second step of `LoginForm` — the 2FA challenge, shown after credentials succeed with `requiresMfa`. */
export default function MfaVerifyStep({ code, onCodeChange, error, isLoading, onSubmit, onCancel, submitDisabled = false, noticeSlot }: MfaVerifyStepProps) {
  return (
    <Card className="w-full rounded-3xl border border-[#0F766E]/15 bg-white shadow-xl shadow-slate-900/10 dark:border-[#2DD4BF]/20 dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E] dark:text-[#5EEAD4]">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">التحقق ثنائي العامل</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">أدخل رمز الـ OTP المكون من 6 أرقام لتأمين حسابك</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-5">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold me-2">خطأ في التحقق</AlertTitle>
              <AlertDescription dir="rtl" className="me-2">{error}</AlertDescription>
            </Alert>
          )}
          {noticeSlot}
          <div className="grid gap-2">
            <Label htmlFor="mfaCode" className="text-slate-700 dark:text-slate-300 font-medium">رمز التحقق</Label>
            <Input
              id="mfaCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              required
              disabled={isLoading}
              dir="ltr"
              maxLength={MFA_CODE_MAX_LENGTH}
              aria-describedby="mfa-code-help"
              className="bg-white dark:bg-slate-950 text-center tracking-widest text-lg font-bold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p id="mfa-code-help" className="text-xs text-slate-400 dark:text-slate-500">
              يمكنك أيضاً استخدام أحد رموز الاسترداد الاحتياطية.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button type="submit" className="w-full bg-[#0F766E] text-white font-semibold shadow-lg shadow-[#0F766E]/20 hover:bg-[#115E59]" disabled={isLoading || submitDisabled}>
            {isLoading ? (
              <>
                <LoaderCircle className="ms-2 h-4 w-4" />
                جاري التحقق...
              </>
            ) : (
              "تأكيد الرمز"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
            onClick={onCancel}
            disabled={isLoading}
          >
            العودة إلى تسجيل الدخول
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
