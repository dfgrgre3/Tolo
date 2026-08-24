"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface MfaSetupInitStepProps {
  error: string | null;
  isLoading: boolean;
  onStart: () => void;
}

/** Initial step of the MFA setup flow — explains 2FA and starts enrollment. */
export default function MfaSetupInitStep({ error, isLoading, onStart }: MfaSetupInitStepProps) {
  return (
    <>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2 text-primary">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">المصادقة الثنائية (2FA)</CardTitle>
        <CardDescription>قم بتأمين حسابك عبر ربطه بتطبيق Google Authenticator</CardDescription>
      </CardHeader>
      <CardContent className="text-center py-6 grid gap-4">
        <p className="text-sm text-muted-foreground">
          المصادقة الثنائية تضيف طبقة أمان إضافية لحسابك. عند تسجيل الدخول، ستحتاج إلى إدخال رمز التحقق بالإضافة لرمز المرور المعتاد.
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription dir="rtl">{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={onStart} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "ابدأ الإعداد"}
        </Button>
      </CardContent>
    </>
  );
}
