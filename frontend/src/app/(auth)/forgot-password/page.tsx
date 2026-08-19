"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, KeyRound, AlertCircle, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { forgotPassword } from "@/services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    await forgotPassword(email.trim());

    // Regardless of success/failure we show the same neutral message to avoid
    // leaking whether an email is registered (account-enumeration protection).
    setSuccess("إذا كان هذا البريد مسجلاً لدينا، فقد تم إرسال رابط لإعادة تعيين كلمة المرور.");
    setIsLoading(false);
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
            <CardDescription className="text-slate-500 dark:text-slate-400">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور</CardDescription>
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
                  <AlertTitle className="font-semibold mr-2">تم الإرسال بنجاح</AlertTitle>
                  <AlertDescription dir="rtl" className="mr-2">{success}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    dir="ltr"
                    className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading || !!success}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال رابط الاستعادة"
                )}
              </Button>
              <div className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/login" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
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
