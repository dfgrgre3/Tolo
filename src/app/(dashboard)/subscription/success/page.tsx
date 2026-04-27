"use client";

import React, { useState } from "react";
import { m } from "framer-motion";
import { CheckCircle2, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InvoiceTemplate } from "@/components/billing/invoice-template";
import { generateInvoicePDF } from "@/utils/billing/generate-pdf";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [downloading, setDownloading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const startDownload = async () => {
    if (!orderId) return;
    setDownloading(true);
    try {
      if (!paymentData) {
        const res = await fetch(`/api/payments/by-order/${orderId}`);
        if (!res.ok) throw new Error("Could not find payment data");
        const data = await res.json();
        setPaymentData(data);
        // Small delay to ensure it's rendered off-screen
        setTimeout(() => {
          generateInvoicePDF(`invoice-${data.id}`, `invoice-${data.id}`);
        }, 500);
      } else {
        generateInvoicePDF(`invoice-${paymentData.id}`, `invoice-${paymentData.id}`);
      }
    } catch (_e) {
      toast.error("حدث خطأ في تحميل الفاتورة");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 font-inter" dir="rtl">
      <div className="max-w-md w-full bg-[#111114] border border-white/5 p-12 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
        {/* Confetti effect background */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
        
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          
          <CheckCircle2 size={48} />
        </m.div>

        <m.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-4">
          
          تم تفعيل اشتراكك!
        </m.h1>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 mb-8 leading-relaxed">
          
          شكراً لك، تم استلام دفعتك بنجاح. يمكنك الآن البدء في استخدام جميع مميزات باقتك الجديدة.
        </m.p>

        {orderId &&
        <div className="space-y-4 mb-10">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm font-mono text-gray-400">
                رقم العملية: #{orderId}
            </div>
            
            <button
            onClick={startDownload}
            disabled={downloading}
            className="w-full py-4 border border-blue-600/30 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-blue-600/20 transition-all disabled:opacity-50">
            
                {downloading ?
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> :

            <>
                        <Download size={18} />
                        تحميل الفاتورة (PDF)
                    </>
            }
            </button>
          </div>
        }

        {/* Hidden template for PDF Capture */}
        {paymentData &&
        <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none">
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
              date: paymentData.createdAt,
              paymentMethod: paymentData.paymentMethod || 'Card'
            }} />
          
          </div>
        }

        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95">
            
            الذهاب للوحة التحكم
            <ArrowRight size={18} className="rotate-180" />
          </Link>
        </m.div>
      </div>
    </div>);

}
