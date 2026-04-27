"use client";

import React from "react";
import { m } from "framer-motion";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 font-inter" dir="rtl">
      <div className="max-w-md w-full bg-[#111114] border border-white/5 p-12 rounded-[2.5rem] text-center shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500" />
        
        <m.div
           initial={{ scale: 0, rotate: -45 }}
           animate={{ scale: 1, rotate: 0 }}
           transition={{ type: "spring", damping: 10, stiffness: 150 }}
           className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
        >
          <AlertCircle size={48} />
        </m.div>

        <m.h1
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="text-3xl font-bold mb-4"
        >
          فشلت عملية الدفع!
        </m.h1>

        <m.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
           className="text-gray-400 mb-10 leading-relaxed"
        >
          نعتذر، لم نتمكن من إتمام عملية الدفع الخاصة بك. ربما هناك خطأ في بيانات البطاقة أو رصيد غير كافٍ.
        </m.p>

        <m.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.4 }}
           className="flex flex-col gap-3"
        >
          <Link
            href="/billing"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={18} />
            محاولة مرة أخرى
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all active:scale-95"
          >
            العودة للوحة التحكم
            <ArrowLeft size={18} className="mr-auto ml-0" />
          </Link>
        </m.div>
      </div>
    </div>
  );
}
