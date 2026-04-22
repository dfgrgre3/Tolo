"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  History,
  ShieldCheck,
  Calendar,

  Zap,
  LayoutDashboard,
  Download,
  Bot,
  BookOpen,
  GraduationCap } from
"lucide-react";

import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { InvoiceTemplate } from "@/components/billing/invoice-template";
import { generateInvoicePDF } from "@/utils/billing/generate-pdf";
import { logger } from '@/lib/logger';

interface ActiveSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  plan: {
    name: string;
    nameAr: string;
    price: number;
  };
  payments?: {
    provider: string;
  }[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  transactionId: string | null;
  orderId: string | null;
  discountAmountValue?: number;
  promoDiscount?: number;
  prorationDiscount?: number;
  balanceUsed?: number;
  discountAmount?: number;
  subscription?: {
    plan?: {
      nameAr?: string;
    };
  };
}

interface BillingSummary {
  name: string;
  email: string;
  balance: number;
  additionalAiCredits: number;
  additionalExamCredits: number;
  activeSubscription: ActiveSubscription | null;
  paymentHistory: PaymentRecord[];
  stats: {
    totalSpent: number;
    paymentCount: number;
    successCount: number;
    pendingCount: number;
    failedCount: number;
  };
}

interface Addon {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  price: number;
  type: string;
  value: number;
}

export default function SubscriptionPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [summaryRes, addonsRes] = await Promise.all([
        fetch('/api/users/billing-summary'),
        fetch('/api/subscriptions/addons')]
        );

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data);
        }

        if (addonsRes.ok) {
          const data = await addonsRes.json();
          setAddons(data.addons || []);
        }
      } catch (err: unknown) {
        logger.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const handlePurchaseAddon = async (addonId: string) => {
    setPurchasing(addonId);
    try {
      const res = await fetch('/api/subscriptions/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId })
      });

      if (res.ok) {
        toast.success("تمت عملية الشراء بنجاح!");
        const summaryRes = await fetch('/api/users/billing-summary');
        if (summaryRes.ok) setSummary(await summaryRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "فشلت عملية الشراء");
      }
    } catch (err: unknown) {
      toast.error("حدث خطأ غير متوقع");
      logger.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2" />
      </div>);

  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] text-white">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p>يجب تسجيل الدخول لعرض ملخص الحساب</p>
          <Link href="/login" className="text-blue-500 hover:underline mt-4 block">تسجيل الدخول</Link>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pt-24 pb-12 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
              <LayoutDashboard size={16} />
              نظرة عامة على الحساب
            </div>
            <h1 className="text-3xl font-bold">إدارة الاشتراك والفواتير</h1>
          </div>
          <Link
            href="/billing"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-center justify-center">
            
            تجديد أو ترقية الاشتراك
            <ArrowUpRight size={18} />
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div whileHover={{ y: -5 }} className="bg-[#111114] border border-white/5 p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Wallet size={20} />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">رصيدك الحالي</span>
            </div>
            <div className="text-2xl font-bold mb-1">{summary.balance.toLocaleString()} ج.م</div>
            <div className="text-gray-400 text-xs">متاح للاستخدام في المنصة</div>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-[#111114] border border-white/5 p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs text-gray-400">إجمالي المدفوعات</span>
            </div>
            <div className="text-2xl font-bold mb-1">{summary.stats.totalSpent.toLocaleString()} ج.م</div>
            <div className="text-gray-400 text-xs">مجموع العمليات الناجحة</div>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-[#111114] border border-white/5 p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs text-gray-400">الاشتراكات المكتملة</span>
            </div>
            <div className="text-2xl font-bold mb-1">{summary.stats.successCount}</div>
            <div className="text-gray-400 text-xs">عمليات مكتملة بنجاح</div>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-[#111114] border border-white/5 p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <XCircle size={20} />
              </div>
              <span className="text-xs text-gray-400">عمليات معلقة/فاشلة</span>
            </div>
            <div className="text-2xl font-bold mb-1">{summary.stats.pendingCount + summary.stats.failedCount}</div>
            <div className="text-gray-400 text-xs">تحتاج لمراجعة</div>
          </motion.div>
        </div>

        {/* Current Credits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-[#111114] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Bot size={24} />
              </div>
              <div>
                <h4 className="text-sm text-gray-400 font-bold">رصيد المساعد الذكي (AI)</h4>
                <div className="text-2xl font-black mt-1">
                  {summary.additionalAiCredits} <span className="text-xs text-gray-500 font-normal">رسالة إضافية</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111114] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                <GraduationCap size={24} />
              </div>
              <div>
                <h4 className="text-sm text-gray-400 font-bold">رصيد الامتحانات الإضافية</h4>
                <div className="text-2xl font-black mt-1">
                  {summary.additionalExamCredits} <span className="text-xs text-gray-500 font-normal">محاولة</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Addons Store Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">متجر الإضافات السريعة</h2>
              <p className="text-gray-400 text-sm">اشحن رصيدك بإضافات لمرة واحدة لدعم رحلتك التعليمية</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Wallet size={16} className="text-blue-500" />
              <span className="text-sm font-bold">{summary.balance} ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map((addon) =>
            <motion.div
              key={addon.id}
              whileHover={{ y: -8 }}
              className="bg-[#111114] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center text-center group relative overflow-hidden">
              
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${
              addon.type === "EXAM_PACK" ? "bg-purple-500/10 text-purple-500" :
              addon.type === "AI_CREDITS" ? "bg-blue-500/10 text-blue-500" :
              "bg-green-500/10 text-green-500"}`
              }>
                  {addon.type === "EXAM_PACK" ? <GraduationCap size={32} /> :
                addon.type === "AI_CREDITS" ? <Bot size={32} /> : <BookOpen size={32} />}
                </div>

                <h3 className="text-lg font-bold mb-2">{addon.nameAr || addon.name}</h3>
                <p className="text-gray-400 text-xs mb-6 max-w-[200px] line-clamp-2">{addon.description}</p>
                <div className="mt-auto w-full">
                  <div className="text-2xl font-black text-white mb-6">
                    {addon.price} <span className="text-xs text-gray-500 font-bold uppercase">ج.م</span>
                  </div>
                  <button
                  onClick={() => handlePurchaseAddon(addon.id)}
                  disabled={purchasing === addon.id || summary.balance < addon.price}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  summary.balance < addon.price ? "bg-white/5 text-gray-500 cursor-not-allowed" :
                  "bg-white text-black hover:bg-white/90 shadow-lg shadow-white/5"}`
                  }>
                  
                    {purchasing === addon.id ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> :
                  <>
                        {summary.balance < addon.price ? "الرصيد غير كافٍ" : "شراء الآن"}
                        <ArrowUpRight size={16} />
                      </>
                  }
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Current Subscription & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap size={20} className="text-yellow-500" />
              الاشتراك الحالي
            </h2>
            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all" />
              {summary.activeSubscription ?
              <>
                  <div className="mb-6">
                    <span className="text-white/60 text-sm uppercase tracking-wider font-bold">خطة {summary.activeSubscription.plan?.nameAr || "الاشتراك"}</span>
                    <h3 className="text-4xl font-extrabold text-white mt-1">نشط</h3>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-white/80">
                      <Calendar size={18} />
                      <span className="text-sm">تاريخ الانتهاء: {format(new Date(summary.activeSubscription.endDate), "dd MMMM yyyy", { locale: ar })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/80">
                      <ShieldCheck size={18} />
                      <span className="text-sm">دفع مؤمن عبر {summary.activeSubscription.payments?.[0]?.provider || "Paymob"}</span>
                    </div>
                  </div>
                  <Link href="/dashboard" className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                    فتح لوحة الطالب
                  </Link>
                </> :

              <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-white/50" />
                  </div>
                  <p className="text-white font-bold mb-6">لا يوجد اشتراك نشط حالياً</p>
                  <Link href="/billing" className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold">اشترك الآن</Link>
                </div>
              }
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <History size={20} className="text-blue-500" />
              سجل العمليات (الفواتير)
            </h2>
            <div className="bg-[#111114] border border-white/5 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="px-6 py-4 text-sm font-bold text-gray-400">الخطة</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-400">القيمة</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-400 text-center">الحالة</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-400 text-center">التاريخ</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-400 text-center">الفاتورة</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-400 text-left">رقم العملية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {summary.paymentHistory.map((payment) =>
                    <tr key={payment.id} className="hover:bg-white/2 transition-colors border-l border-transparent hover:border-blue-500/30">
                        <td className="px-6 py-4">
                          <div className="font-bold">{payment.subscription?.plan?.nameAr || "رصيد / شحن"}</div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{payment.paymentMethod || "Card"}</div>
                        </td>
                        <td className="px-6 py-4 font-bold">{payment.amount} ج.م</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                          payment.status === "SUCCESS" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                          payment.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                          "bg-red-500/10 text-red-500 border border-red-500/20"}`
                          }>
                              {payment.status === "SUCCESS" ? <CheckCircle2 size={10} /> :
                            payment.status === "PENDING" ? <Clock size={10} /> : <XCircle size={10} />}
                              {payment.status === "SUCCESS" ? "ناجحة" : payment.status === "PENDING" ? "قيد الانتظار" : "فشلت"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 text-center">
                          {format(new Date(payment.createdAt), "dd MMMM yyyy", { locale: ar })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {payment.status === "SUCCESS" &&
                          <button
                            onClick={() => generateInvoicePDF(`invoice-${payment.id}`, `invoice-${payment.id}`)}
                            className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-all hover:scale-110 active:scale-95"
                            title="تحميل الفاتورة">
                            
                                <Download size={14} />
                              </button>
                          }
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-gray-500 text-left">
                          <span title={payment.transactionId || ""}>
                            {payment.transactionId ? `${payment.transactionId.slice(0, 10)}...` : "---"}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Hidden Off-screen Invoice Templates for Capturing */}
              <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none">
                {summary.paymentHistory.filter((p) => p.status === "SUCCESS").map((payment) =>
                <InvoiceTemplate
                  key={payment.id}
                  data={{
                    paymentId: payment.id,
                    orderId: payment.orderId || "",
                    customerName: summary.name,
                    customerEmail: summary.email,
                    planName: payment.subscription?.plan?.nameAr || "رصيد / شحن",
                    amount: payment.amount + (payment.discountAmountValue || 0),
                    discountAmount: payment.discountAmountValue,
                    promoDiscount: payment.promoDiscount,
                    prorationDiscount: payment.prorationDiscount,
                    balanceUsed: payment.balanceUsed,
                    finalAmount: payment.amount,
                    date: payment.createdAt,
                    paymentMethod: payment.paymentMethod || "Card"
                  }} />

                )}
              </div>
              {summary.paymentHistory.length === 0 &&
              <div className="p-12 text-center text-gray-500">
                  <p>لا توجد أي عمليات دفع حتى الآن.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>);

}