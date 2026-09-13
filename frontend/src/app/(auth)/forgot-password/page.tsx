"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword, verifyForgotPasswordCode } from "@/services/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (step === "email") {
      if (!email.trim()) {
        setError("يرجى إدخال البريد الإلكتروني");
        setIsLoading(false);
        return;
      }

      const result = await forgotPassword(email.trim());
      if (!result.success) {
        setError(result.error || "تعذر إرسال رمز الاستعادة");
        setIsLoading(false);
        return;
      }

      setStep("code");
      setSuccess("إذا كان هذا البريد مسجلاً لدينا، فقد تم إرسال رمز التحقق إليه.");
      setIsLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("أدخل رمز التحقق المكون من 6 أرقام");
      setIsLoading(false);
      return;
    }

    const result = await verifyForgotPasswordCode(email.trim(), code);
    if (!result.success || !result.resetToken) {
      setError(result.error || "رمز التحقق غير صالح أو منتهي الصلاحية");
      setIsLoading(false);
      return;
    }

    router.push(`/reset-password?token=${encodeURIComponent(result.resetToken)}`);
  };

  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="w-full max-w-[460px] mx-auto">
        <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">استعادة كلمة المرور</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {step === "email" ? "أدخل بريدك الإلكتروني لإرسال رمز التحقق" : "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-5">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold me-2">خطأ</AlertTitle>
                  <AlertDescription dir="rtl" className="me-2">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="font-semibold me-2">تم الإرسال بنجاح</AlertTitle>
                  <AlertDescription dir="rtl" className="me-2">{success}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3 flex items-center text-slate-400"><Mail className="h-4 w-4" /></span>
                  <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading || step === "code"} dir="ltr" className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
              </div>
              {step === "code" && (
                <div className="grid gap-2">
                  <Label htmlFor="code" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">رمز التحقق</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-3 flex items-center text-slate-400"><ShieldCheck className="h-4 w-4" /></span>
                    <Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required disabled={isLoading} dir="ltr" className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? <><Loader2 className="ms-2 h-4 w-4 animate-spin" />{step === "email" ? "جاري الإرسال..." : "جاري التحقق..."}</> : step === "email" ? "إرسال رمز الاستعادة" : "التحقق والمتابعة"}
              </Button>
              <div className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/login" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">العودة لتسجيل الدخول</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
