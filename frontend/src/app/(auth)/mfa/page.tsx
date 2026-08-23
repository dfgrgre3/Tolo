"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle, Download } from "lucide-react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

interface MfaSetupResponse {
  secret: string;
  qrCodeUrl?: string;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

export default function MfaPage() {
  const [step, setStep] = useState<"init" | "verify" | "backup">("init");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responseData = await apiClient.post<MfaSetupResponse>(apiRoutes.auth.mfa.setup, {
        method: "totp",
      });
      setSecret(responseData.secret);
      setQrCodeUrl(responseData.qrCodeUrl || "");
      setStep("verify");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "فشل تهيئة المصادقة الثنائية"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const responseData = await apiClient.post<{ backupCodes?: string[] }>(
        apiRoutes.auth.mfa.enable,
        { code }
      );
      setBackupCodes(responseData.backupCodes || []);
      setSuccess("تم تفعيل المصادقة الثنائية بنجاح!");
      setStep("backup");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "فشل التحقق"));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "tolo-mfa-backup-codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container relative min-h-[80vh] flex items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[460px] p-4">
        <Card className="w-full border-none shadow-2xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2 text-primary">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">المصادقة الثنائية (2FA)</CardTitle>
            <CardDescription>قم بتأمين حسابك عبر ربطه بتطبيق Google Authenticator</CardDescription>
          </CardHeader>

          {step === "init" && (
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
              <Button onClick={startSetup} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "ابدأ الإعداد"}
              </Button>
            </CardContent>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify}>
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
                    <img src={qrCodeUrl} alt="MFA QR Code" className="w-full h-auto" />
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
                    onChange={(e) => setCode(e.target.value)}
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
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "تفعيل المصادقة الثنائية"}
                </Button>
                <Button variant="ghost" onClick={() => setStep("init")} className="w-full">
                  إلغاء الإعداد
                </Button>
              </CardFooter>
            </form>
          )}

          {step === "backup" && (
            <CardContent className="grid gap-4">
              {success && (
                <Alert className="border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>عملية ناجحة</AlertTitle>
                  <AlertDescription dir="rtl">{success}</AlertDescription>
                </Alert>
              )}
              <div className="text-center text-sm font-semibold mb-2">
                يرجى حفظ رموز الاستعادة الاحتياطية هذه في مكان آمن. ستحتاجها لاستعادة حسابك في حال فقدان هاتفك:
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg font-mono text-center tracking-wide text-sm font-bold border border-slate-200 dark:border-slate-800">
                {backupCodes.map((bc, idx) => (
                  <div key={idx} className="p-1 select-all">{bc}</div>
                ))}
              </div>
              <Button onClick={downloadBackupCodes} className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900">
                <Download className="h-4 w-4 mr-2" /> تحميل رموز الاستعادة
              </Button>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full">الذهاب للوحة التحكم</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
