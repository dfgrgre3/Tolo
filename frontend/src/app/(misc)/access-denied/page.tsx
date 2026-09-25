"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="container min-h-[75vh] flex flex-col items-center justify-center text-center p-4">
      <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-full mb-6 text-destructive">
        <ShieldAlert className="h-16 w-16" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2">عذراً! وصول غير مصرح</h1>
      <p className="text-muted-foreground max-w-[500px] mb-8 text-base">
        لا تمتلك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى التحقق من نوع حسابك أو الاتصال بالدعم الفني إذا كنت تعتقد أن هذا خطأ.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="ml-2 h-4 w-4" /> العودة للخلف
        </Button>
        <Button onClick={() => router.push("/dashboard")}>
          <Home className="ml-2 h-4 w-4" /> لوحة التحكم
        </Button>
      </div>
    </div>
  );
}
