"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface MfaSetupVerifyStepProps {
  secret: string;
  qrCodeUrl: string;
  code: string;
  onCodeChange: (value: string) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/** Second step of the MFA setup flow — scan QR code and confirm with a TOTP code. */
export default function MfaSetupVerifyStep({
  secret,
  qrCodeUrl,
  code,
  onCodeChange,
  error,
  isLoading,
  onSubmit,
  onCancel,
}: MfaSetupVerifyStepProps) {
  return (
    <form onSubmit={onSubmit}>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription dir="rtl">{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center text-sm mb-2 text-muted-foreground">
          قم بمسح رمز الاستجابة السريعة (QR Code) بكاميرا تطبيق المصادقة الخاص بك:
        </div>
        {qrCodeUrl && (
          <div className="flex justify-center p-3 bg-white rounded-lg border border-slate-200 dark:border-slate-800 max-w-[200px] mx-auto">
            <Image src={qrCodeUrl} alt="MFA QR Code" width={200} height={200} priority unoptimized className="w-full h-auto" />
          </div>
        )}
        <div className="text-center mt-2 text-xs">
          أو أدخل الرمز السري يدوياً: <code className="block mt-1 p-1 bg-slate-100 dark:bg-slate-950 font-mono font-bold select-all tracking-wider text-sm">{secret}</code>
        </div>
        <div className="grid gap-2 mt-2">
          <Label htmlFor="code">رمز التحقق للتأكيد</Label>
          <Input
            id="code"
            placeholder="000000"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            required
            disabled={isLoading}
            dir="ltr"
            maxLength={6}
            className="bg-white/50 dark:bg-slate-950/50 text-center tracking-widest text-lg font-bold"
          />
        </div>
      </CardContent>
      <CardFooter className="grid gap-2">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : "تفعيل المصادقة الثنائية"}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full">
          إلغاء الإعداد
        </Button>
      </CardFooter>
    </form>
  );
}
