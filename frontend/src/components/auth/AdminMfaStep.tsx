"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface AdminMfaStepProps {
  code: string;
  onCodeChange: (value: string) => void;
  errorStatus: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/** Second step of the admin/staff login flow — 2FA challenge. */
export default function AdminMfaStep({
  code,
  onCodeChange,
  errorStatus,
  isSubmitting,
  onSubmit,
  onCancel,
}: AdminMfaStepProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 shadow-2xl"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-red-500/10 mb-6 border border-red-500/20">
          <ShieldCheck className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">تأكيد أمني إضافي</h3>
        <p className="text-slate-400 font-medium">أدخل رمز الأمان من تطبيق المصادقة (2FA)</p>
      </div>

      {errorStatus && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="mr-2 font-semibold">خطأ</AlertTitle>
          <AlertDescription dir="rtl" className="mr-2">{errorStatus}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/[^0-9]/g, ""))}
          autoFocus
          dir="ltr"
          placeholder="000000"
          className="w-full text-center tracking-[0.6em] text-2xl font-black rounded-2xl border border-white/10 bg-white/5 py-6 text-white placeholder:text-slate-600"
        />
        <Button
          type="submit"
          disabled={isSubmitting || code.length < 6}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black shadow-xl shadow-red-500/20 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "تحقق وفتح الصلاحيات"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="w-full text-slate-500 hover:text-white"
        >
          إلغاء والمحاولة مرة أخرى
        </Button>
      </div>
    </form>
  );
}
