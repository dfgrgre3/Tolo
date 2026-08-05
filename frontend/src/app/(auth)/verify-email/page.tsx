"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "رمز التحقق غير صحيح أو منتهي الصلاحية");
      }

      setSuccess("تم تأكيد بريدك الإلكتروني بنجاح! سيتم تحويلك للوحة التحكم...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل إعادة إرسال الرمز");
      }

      setSuccess("تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.");
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="w-full max-w-[460px] mx-auto">
        <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Mail className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">تأكيد البريد الإلكتروني</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-5">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold mr-2">خطأ</AlertTitle>
                  <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="font-semibold mr-2">تأكيد العملية</AlertTitle>
                  <AlertDescription dir="rtl" className="mr-2">{success}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="code" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">رمز التحقق (OTP)</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isLoading}
                  dir="ltr"
                  maxLength={6}
                  className="bg-white dark:bg-slate-950 text-center tracking-[0.5em] text-2xl font-bold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading || !!success}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التأكيد...
                  </>
                ) : (
                  "تأكيد الحساب"
                )}
              </Button>
              <div className="flex justify-between w-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || !!success}
                  className="text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {isResending ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
                </button>
                <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
