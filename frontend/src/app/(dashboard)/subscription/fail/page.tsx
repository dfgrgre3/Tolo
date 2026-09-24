"use client";

import React, { Suspense } from "react";
import { AlertCircle, ArrowLeft, RefreshCw, LayoutDashboard, Headset } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function reasonLabel(raw: string | null): string {
  if (!raw) {
    return "نعتذر، لم نتمكن من إتمام عملية الدفع الخاصة بك. ربما هناك خطأ في بيانات البطاقة أو رصيد غير كافٍ.";
  }
  const key = raw.trim().toLowerCase();
  const known: Record<string, string> = {
    declined: "تم رفض البطاقة من البنك — تحقق من الرصيد أو بيانات البطاقة وحاول مجدداً.",
    insufficient: "الرصيد غير كافٍ لإتمام العملية — اشحن محفظتك أو استخدم بطاقة أخرى.",
    expired: "انتهت مهلة الدفع قبل إتمامه — ابدأ عملية دفع جديدة.",
    cancelled: "تم إلغاء عملية الدفع — يمكنك المحاولة مجدداً في أي وقت.",
    duplicate: "تم رصد عملية مكررة — تحقق من سجل الفواتير قبل إعادة المحاولة.",
  };
  if (known[key]) return known[key];
  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
}

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get("order_id") ??
    searchParams.get("orderId") ??
    searchParams.get("merchant_order_id");
  const reason = reasonLabel(
    searchParams.get("reason") ??
      searchParams.get("error") ??
      searchParams.get("message"),
  );

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4 py-12" dir="rtl">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-orange-500" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div
          className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-rose-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
        >
          <AlertCircle size={48} />
        </div>

        <h1 className="text-3xl font-black mb-4">فشلت عملية الدفع!</h1>
        <p className="text-gray-400 font-medium mb-6 leading-relaxed">{reason}</p>

        {orderId && (
          <div className="mb-8 p-3 rounded-2xl bg-black/40 border border-white/10 text-sm font-mono text-gray-400" dir="ltr">
            #{orderId}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/billing?tab=upgrade"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black shadow-[0_20px_50px_rgba(var(--primary-rgb),0.4)]"
          >
            <RefreshCw size={18} />
            محاولة مرة أخرى
          </Link>
          <Link
            href="/subscription"
            className="flex items-center justify-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-black text-sm"
          >
            <LayoutDashboard size={16} />
            مراجعة الاشتراك والفواتير
          </Link>
          <Link
            href="/support"
            className="flex items-center justify-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-black text-sm"
          >
            <Headset size={16} />
            التواصل مع الدعم
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-8 py-3 text-gray-500 hover:text-white rounded-2xl font-bold text-sm"
          >
            العودة للوحة التحكم
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="h-12 w-12 border-t-2 border-rose-500 rounded-full" />
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
