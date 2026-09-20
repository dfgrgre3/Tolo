"use client";

import React, { useState, Suspense, useEffect } from "react";
import { m } from "framer-motion";
import { CheckCircle2, ArrowRight, Download, LayoutDashboard, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InvoiceTemplate } from "@/components/billing/invoice-template";
import { generateInvoicePDF } from "@/utils/billing/generate-pdf";
import { fetchPaymentByOrderRaw } from "@/features/payments/api/payments-gateway";
import { formatEGP } from "@/lib/payments";

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="h-12 w-12 border-t-2 border-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

interface PaymentData {
  id: string;
  orderId?: string;
  amount: number;
  discountAmount?: number;
  status?: string;
  createdAt?: string;
  paymentMethod?: string;
  user?: { name?: string; email?: string };
  subscription?: { plan?: { nameAr?: string } };
}

type VerifyState = "idle" | "verifying" | "verified" | "failed";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [downloading, setDownloading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // التحقق التلقائي من حالة الدفع عند الوصول للصفحة
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const verify = async () => {
      setVerifyState("verifying");
      setVerifyError(null);
      try {
        const data = await fetchPaymentByOrderRaw<PaymentData>(orderId);
        if (cancelled) return;
        setPaymentData(data);
        const status = (data.status || "").toUpperCase();
        if (status === "FAILED" || status === "CANCELLED") {
          setVerifyState("failed");
          setVerifyError("حالة الدفع المسجلة: فاشلة — راجع صفحة الفشل أو حاول مجدداً");
        } else {
          setVerifyState("verified");
        }
      } catch (error) {
        if (cancelled) return;
        setVerifyState("failed");
        setVerifyError(error instanceof Error ? error.message : "تعذر التحقق من حالة الدفع");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const startDownload = async () => {
    if (!orderId) return;
    setDownloading(true);
    try {
      const data =
        paymentData ??
        (await fetchPaymentByOrderRaw<PaymentData>(orderId));
      setPaymentData(data);
      setVerifyState("verified");
      setTimeout(() => {
        generateInvoicePDF(`invoice-${data.id}`, `invoice-${data.id}`);
      }, 500);
    } catch {
      toast.error("حدث خطأ في تحميل الفاتورة");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4 py-12" dir="rtl">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
        >
          <CheckCircle2 size={48} />
        </m.div>

        <h1 className="text-3xl font-black mb-4">تم تفعيل اشتراكك!</h1>
        <p className="text-gray-400 font-medium mb-8 leading-relaxed">
          شكراً لك، تم استلام دفعتك بنجاح. يمكنك الآن البدء في استخدام جميع مميزات باقتك الجديدة.
        </p>

        {orderId && (
          <div className="space-y-4 mb-10">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-sm font-mono text-gray-400" dir="ltr">
              #{orderId}
            </div>
            {verifyState === "verifying" && (
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                جاري التحقق من حالة الدفع...
              </div>
            )}
            {verifyState === "verified" && paymentData && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-bold text-emerald-400">
                تم تأكيد الدفع: {paymentData.subscription?.plan?.nameAr || "باقة تعليمية"} — {formatEGP(paymentData.amount)}
              </div>
            )}
            {verifyState === "failed" && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm font-bold text-rose-400 flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {verifyError || "تعذر تأكيد حالة الدفع — تحقق من سجل الفواتير"}
              </div>
            )}
            <button
              onClick={startDownload}
              disabled={downloading}
              className="w-full py-4 border border-primary/30 bg-primary/10 text-primary rounded-2xl flex items-center justify-center gap-3 font-black hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              {downloading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Download size={18} />
                  تحميل الفاتورة (PDF)
                </>
              )}
            </button>
          </div>
        )}

        {paymentData && (
          <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none" aria-hidden>
            <InvoiceTemplate
              data={{
                paymentId: paymentData.id,
                orderId: paymentData.orderId,
                customerName: paymentData.user?.name || "طالب",
                customerEmail: paymentData.user?.email || "",
                planName: paymentData.subscription?.plan?.nameAr || "باقة تعليمية",
                amount: paymentData.amount + (paymentData.discountAmount || 0),
                discountAmount: paymentData.discountAmount,
                finalAmount: paymentData.amount,
                date: paymentData.createdAt || new Date().toISOString(),
                paymentMethod: paymentData.paymentMethod || "Card",
              }}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95"
          >
            الذهاب للوحة التحكم
            <ArrowRight size={18} className="rotate-180" />
          </Link>
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-black text-sm transition-all"
          >
            <LayoutDashboard size={16} />
            عرض الاشتراك والفواتير
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          معاملة مشفرة وآمنة
        </div>
      </div>
    </div>
  );
}
