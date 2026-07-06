"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TeachingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Teaching Module Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-4 text-center" dir="rtl">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            حدث خطأ غير متوقع
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            لم نتمكن من تحميل لوحة تحكم المعلم بالشكل الصحيح. قد يكون ذلك بسبب عطل مؤقت في الاتصال بالخادم.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
