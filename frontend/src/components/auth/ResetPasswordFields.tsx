"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

interface ResetPasswordFieldsProps {
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  error: string | null;
  success: string | null;
  isLoading: boolean;
  hasToken: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Presentational fields for the reset-password page. */
export default function ResetPasswordFields({
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  error,
  success,
  isLoading,
  hasToken,
  onSubmit,
}: ResetPasswordFieldsProps) {
  return (
    <form onSubmit={onSubmit}>
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
            <AlertTitle className="font-semibold me-2">تم التحديث</AlertTitle>
            <AlertDescription dir="rtl" className="me-2">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كلمة المرور الجديدة</Label>
          <div className="relative">
            <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              required
              disabled={isLoading || !hasToken}
              dir="ltr"
              className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">تأكيد كلمة المرور</Label>
          <div className="relative">
            <span className="absolute inset-y-0 start-3 flex items-center text-slate-400">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              required
              disabled={isLoading || !hasToken}
              dir="ltr"
              className="bg-white dark:bg-slate-950 ps-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-4">
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading || !hasToken || !!success}>
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              جاري التحديث...
            </>
          ) : (
            "تعيين كلمة المرور الجديدة"
          )}
        </Button>
        <div className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
          <Link href="/login" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}
