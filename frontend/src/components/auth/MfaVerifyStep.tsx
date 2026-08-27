"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

/** Length of a TOTP code; backup recovery codes are longer. */
const MFA_CODE_MAX_LENGTH = 10;

interface MfaVerifyStepProps {
  code: string;
  onCodeChange: (value: string) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/** Second step of `LoginForm` — the 2FA challenge, shown after credentials succeed with `requiresMfa`. */
export default function MfaVerifyStep({ code, onCodeChange, error, isLoading, onSubmit, onCancel }: MfaVerifyStepProps) {
  return (
    <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
              className="bg-white dark:bg-slate-950 text-center tracking-widest text-lg font-bold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              يمكنك أيضاً استخدام أحد رموز الاسترداد الاحتياطية.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
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
