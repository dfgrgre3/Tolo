"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,

  Plus,
  Receipt,


  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity,

  DollarSign,
  Sparkles,
  Gift,
  Loader2 } from
"lucide-react";
import type { LucideIcon } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { SITE } from "@thanawy/shared/site-config";
import WalletGrowthChart from "./WalletGrowthChart";
import { WalletHeroSkeleton } from "./BillingSkeletons";
import {
  fetchWalletSummaryRaw,
  topupWalletRaw,
} from "@/features/payments/api/payments-gateway";
import {
  PAYMENT_METHOD_META,
  resolvePaymentAction,
  type PaymentInitResponse,
  type PaymentMethod,
} from "@/lib/payments";
import {
  BillingTableShell,
  BillingPagination,
  BillingEmptyState,
  BillingFilterBar,
  BillingSectionTitle,
  BillingStatusBadge,
  exportToCsv,
} from "./billing-ui";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issueDate: string;
  pdfUrl?: string;
}

const typeMap: Record<string, {label: string;icon: LucideIcon;color: string;bg: string;}> = {
  "DEPOSIT": { label: "إيداع", icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "PAYMENT": { label: "مدفوعات", icon: ArrowDownLeft, color: "text-rose-500", bg: "bg-rose-500/10" },
  "REFUND": { label: "استرداد", icon: History, color: "text-blue-500", bg: "bg-blue-500/10" },
  "REFERRAL_REWARD": { label: "مكافأة", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
  "BONUS": { label: "بونص", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" }
};

// --- Enhanced Sub-components ---

const VirtualCard = ({ balance, txCount }: {balance: number;txCount: number;}) =>
<m.div
  whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
  className="relative w-full aspect-[1.6/1] rounded-[2.5rem] p-8 overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] cursor-pointer">
  
    <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-primary/80 transition-all duration-700 group-hover:hue-rotate-30" />
    {/* CSS-only texture: an external transparenttextures.com URL used to live
        here, but it violates the img-src CSP allowlist (see lib/security/csp.ts)
        and leaks referrers to a third party. This radial-gradient dot pattern
        renders the same carbon-fibre feel with zero network requests. */}
    <div
      className="absolute inset-0 opacity-10 mix-blend-overlay"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
      aria-hidden="true"
    />
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[100px] rounded-full -mr-32 -mt-32" />
    
    <div className="relative h-full flex flex-col justify-between text-white z-10">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{SITE.nameAr} بريميوم</p>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="font-black text-xl italic uppercase tracking-wider">{SITE.name} Platinum</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-md flex items-center justify-center border border-white/30">
          <Zap className="w-6 h-6 text-amber-300" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">الرصيد المتاح</p>
           <h3 className="text-4xl font-black tracking-tight">{balance?.toLocaleString() || '0'} <span className="text-lg font-bold opacity-60">ج.م</span></h3>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase opacity-40">عدد العمليات</p>
              <p className="text-xs font-black">{txCount} عملية</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase opacity-40">نوع البطاقة</p>
              <p className="text-xs font-black">عضو مميز</p>
            </div>
          </div>
          <div className="flex items-center -space-x-4">
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40" />
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40" />
          </div>
        </div>
      </div>
    </div>
  </m.div>;


const TOPUP_METHODS: PaymentMethod[] = ["card", "wallet", "fawry"];

const DepositModal = ({ isOpen, onClose, onDeposit }: {isOpen: boolean;onClose: () => void;onDeposit: (amount: number, method: PaymentMethod) => Promise<PaymentInitResponse | void>;}) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    setLoading(true);
    try {
      const res = await onDeposit(val, method);
      if (!res) {
        onClose();
        return;
      }
      const action = resolvePaymentAction(method, res);
      switch (action.kind) {
        case "redirect":
        case "iframe":
        case "wallet":
          window.location.href = action.url;
          return;
        case "fawry-code":
          toast.success(`كود فوري الخاص بك: ${action.code} — ادفع من أقرب منفذ فوري`);
          onClose();
          return;
        case "success":
          toast.success("تم شحن الرصيد بنجاح");
          onClose();
          return;
        case "pending":
          toast.info("تم إنشاء طلب الشحن — تابع حالته من السجل المالي");
          onClose();
          return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الشحن");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#07080f]/90 backdrop-blur-md" />
        
          <m.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#111322] border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden">
          
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600" />
            
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white">شحن الرصيد</h3>
                <p className="text-gray-400 font-medium">اختر المبلغ الذي تود إضافته لمحفظتك فوراً.</p>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
                <ArrowRight className="w-6 h-6 text-white rotate-180" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-[2.2rem] py-8 px-20 text-4xl font-black text-white outline-none focus:border-primary/50 transition-all text-center" />
              
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">ج.م</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[50, 100, 250].map((num) =>
              <button
                key={num}
                onClick={() => setAmount(num.toString())}
                className="py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-primary hover:text-white font-black transition-all transform active:scale-95">
                
                    +{num}
                  </button>
              )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400">طريقة الدفع</p>
                <div className="grid grid-cols-3 gap-3">
                  {TOPUP_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`rounded-2xl border px-2 py-4 text-center transition-all active:scale-95 ${
                        method === m
                          ? "border-primary bg-primary/15 text-white shadow-lg shadow-primary/20"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span className="block text-sm font-black">{PAYMENT_METHOD_META[m].label}</span>
                      <span className="mt-1 block text-[10px] font-medium opacity-70">{PAYMENT_METHOD_META[m].sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-6 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black text-xl transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-70">
              
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Zap className="w-6 h-6" />}
                {loading ? "جاري المعالجة..." : "تأكيد الشحن الآن"}
              </button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-widest bg-white/5 py-4 rounded-2xl border border-white/5">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               بوابات دفع مشفرة وآمنة تماماً
            </div>
          </m.div>
        </div>
      }
    </AnimatePresence>);

};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("تم نسخ رقم المعاملة");
};

export default function WalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activity" | "invoices">("activity");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [txFilter, setTxFilter] = useState("ALL");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  // بديل ssr:false — الرسم البياني يعتمد على أبعاد المتصفح، يُرسم بعد التركيب فقط
  const [mounted, setMounted] = useState(false);

  const fetchData = async () => {
    try {
      const walletData = await fetchWalletSummaryRaw<{
        balance?: number;
        history?: Transaction[];
        transactions?: Transaction[];
        invoices?: Invoice[];
      }>();

      setBalance(typeof walletData?.balance === "number" && Number.isFinite(walletData.balance) ? walletData.balance : 0);
      // تطبيع القوائم — أي عنصر ناقص من الـ API يُستبدل بقيم آمنة حتى لا يسقط العرض
      const rawTx = walletData?.history || walletData?.transactions || [];
      setTransactions(
        (Array.isArray(rawTx) ? rawTx : []).map((tx, i) => ({
          id: typeof tx?.id === "string" ? tx.id : `tx-${i}`,
          amount: typeof tx?.amount === "number" && Number.isFinite(tx.amount) ? tx.amount : 0,
          type: typeof tx?.type === "string" ? tx.type : "UNKNOWN",
          description: typeof tx?.description === "string" && tx.description ? tx.description : "معاملة مالية",
          createdAt: typeof tx?.createdAt === "string" ? tx.createdAt : new Date().toISOString(),
        }))
      );
      const rawInv = walletData?.invoices || [];
      setInvoices(
        (Array.isArray(rawInv) ? rawInv : []).map((inv, i) => ({
          id: typeof inv?.id === "string" ? inv.id : `inv-${i}`,
          invoiceNumber: typeof inv?.invoiceNumber === "string" && inv.invoiceNumber ? inv.invoiceNumber : `INV-${i + 1}`,
          amount: typeof inv?.amount === "number" && Number.isFinite(inv.amount) ? inv.amount : 0,
          status: typeof inv?.status === "string" ? inv.status : "UNKNOWN",
          issueDate: typeof inv?.issueDate === "string" ? inv.issueDate : new Date().toISOString(),
          pdfUrl: inv?.pdfUrl,
        }))
      );
    } catch (_error) {
      toast.error("فشل في تحميل بيانات المحفظة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      fetchData();
    });
  }, []);

  const handleDeposit = async (amount: number, method: PaymentMethod) => {
    // Backend `CreatePaymentRequest` validates the `Method` field
    // (JSON `method`) as required — `paymentMethod` is kept as an alias
    // for any handler that still reads the old key.
    const data = await topupWalletRaw<PaymentInitResponse & { balance?: number; message?: string }>(
      amount,
      method,
    );

    // شحن مباشر (رصيد داخلي/إداري) يعيد الرصيد فوراً بدون بوابة دفع
    if (typeof data.balance === "number" && Number.isFinite(data.balance)) {
      setBalance(data.balance);
      toast.success(data.message || "تم الشحن بنجاح");
      fetchData(); // Refresh history
      return;
    }
    fetchData(); // Refresh history (pending top-up row)
    return data;
  };

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    let currentBalance = balance;
    const history = [...transactions].reverse().map((tx) => {
      const point = {
        name: format(new Date(tx.createdAt), "dd MMM", { locale: ar }),
        balance: currentBalance
      };
      currentBalance -= tx.amount;
      return point;
    }).reverse();

    return history;
  }, [transactions, balance]);

  // ── اتجاه النمو الحقيقي: صافي الشهر الحالي مقابل السابق ──
  const growth = useMemo(() => {
    if (transactions.length === 0) return null;
    const now = new Date();
    const monthNet = (m: number, y: number) =>
      transactions
        .filter((tx) => {
          const d = new Date(tx.createdAt);
          return d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((acc, tx) => acc + tx.amount, 0);
    const cur = monthNet(now.getMonth(), now.getFullYear());
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = monthNet(prevDate.getMonth(), prevDate.getFullYear());
    if (prev === 0) return cur > 0 ? 100 : cur < 0 ? -100 : 0;
    return Math.round(((cur - prev) / Math.abs(prev)) * 100);
  }, [transactions]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter((tx) => {
      const date = new Date(tx.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const spent = Math.abs(thisMonth.filter((tx) => tx.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));
    const received = thisMonth.filter((tx) => tx.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);

    return { spent, received };
  }, [transactions]);

  // ── نظام الفلترة الموحد (نفس صفحة الاشتراك والفواتير) ──
  const isRefundTx = (tx: Transaction) =>
    tx.type === "REFUND" || tx.description.includes("استرداد") || tx.description.toLowerCase().includes("refund");

  const refundsSummary = useMemo(() => {
    const refunds = transactions.filter(isRefundTx);
    return {
      count: refunds.length,
      total: refunds.reduce((acc, tx) => acc + Math.abs(tx.amount), 0),
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      if (txFilter === "IN" && tx.amount <= 0) return false;
      if (txFilter === "OUT" && tx.amount > 0) return false;
      if (txFilter === "REFUND" && !isRefundTx(tx)) return false;
      if (!q) return true;
      return `${tx.description} ${tx.type} ${tx.amount}`.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt)
    );
  }, [transactions, query, txFilter, sortDir]);

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = invoices.filter((inv) => {
      if (txFilter !== "ALL" && (inv.status || "").toUpperCase() !== txFilter) return false;
      if (!q) return true;
      return `${inv.invoiceNumber} ${inv.amount}`.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? +new Date(b.issueDate) - +new Date(a.issueDate)
        : +new Date(a.issueDate) - +new Date(b.issueDate)
    );
  }, [invoices, query, txFilter, sortDir]);

  const activeList = activeTab === "activity" ? filteredTransactions : filteredInvoices;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTransactions = filteredTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExport = () => {
    if (activeTab === "activity") {
      if (filteredTransactions.length === 0) { toast.info("لا توجد معاملات لتصديرها"); return; }
      exportToCsv("transactions", filteredTransactions.map((tx) => ({
        "الوصف": tx.description,
        "النوع": typeMap[tx.type]?.label ?? tx.type,
        "المبلغ (ج.م)": tx.amount,
        "التاريخ": format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
      })));
    } else {
      if (filteredInvoices.length === 0) { toast.info("لا توجد فواتير لتصديرها"); return; }
      exportToCsv("invoices", filteredInvoices.map((inv) => ({
        "رقم الفاتورة": inv.invoiceNumber,
        "القيمة (ج.م)": inv.amount,
        "الحالة": inv.status,
        "التاريخ": format(new Date(inv.issueDate), "yyyy-MM-dd"),
      })));
    }
    toast.success("تم تصدير CSV بنجاح");
  };

  return (
    <div className="space-y-12" dir="rtl">
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDeposit={handleDeposit} />
      

      {/* Hero Section */}
      {loading ?
      <WalletHeroSkeleton /> :

      <section className="relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-[#1a1c2e] via-[#101222] to-[#010205] p-1 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] opacity-40 pointer-events-none" />
          
          <div className="relative rounded-[3.9rem] bg-[#101222]/40 backdrop-blur-3xl p-8 md:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Card & Chart Group */}
              <div className="space-y-12">
                <VirtualCard balance={balance} txCount={transactions.length} />
                
                <div className="flex flex-wrap gap-6">
                  <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDepositModalOpen(true)}
                  className="group relative overflow-hidden bg-primary px-12 py-6 rounded-[2.2rem] font-black text-white shadow-[0_20px_50px_rgba(var(--primary-rgb),0.5)] flex items-center gap-4 transition-all">
                  
                    <Plus className="w-7 h-7" />
                    <span className="text-xl">شحن الحساب</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </m.button>
                  <Link
                  href="/subscription"
                  className="group px-12 py-6 rounded-[2.2rem] border-2 border-white/10 bg-white/5 text-white font-black backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95 flex items-center gap-4">

                    <Receipt className="w-7 h-7 group-hover:scale-110 transition-transform" />
                    <span className="text-xl">سجل الفواتير</span>
                  </Link>
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="space-y-10">
                <div className="h-[280px] w-full bg-white/5 rounded-[3rem] p-8 border border-white/10 backdrop-blur-sm relative group overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/20 rounded-xl">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-black text-gray-300 uppercase tracking-[0.2em]">تحليل النمو</span>
                    </div>
                    {growth !== null && (
                      <div className={`text-[10px] font-black px-3 py-1 rounded-full border ${growth >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"}`}>
                        {growth >= 0 ? `صاعد +${growth}%` : `هابط ${growth}%`}
                      </div>
                    )}
                  </div>
                  
                  <div className="h-full">
                    {mounted ? (
                      <WalletGrowthChart data={chartData} />
                    ) : (
                      <div className="h-[80%] flex items-center justify-center">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                { label: "منصرف هـذا الشهر", val: stats.spent, icon: ArrowDownLeft, color: "text-rose-400", bg: "bg-rose-500/10" },
                { label: "وارد هذا الشهر", val: stats.received, icon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-500/10" }].
                map((s, i) =>
                <div key={i} className="bg-white/5 rounded-[2.2rem] p-6 border border-white/5 transition-all hover:bg-white/10">
                      <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-black text-gray-500 mb-1">{s.label}</p>
                      <h4 className="text-2xl font-black text-white">{s.val.toLocaleString()} <span className="text-xs opacity-40 font-bold">ج.م</span></h4>
                    </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </section>
      }

      {/* Quick Access Grid — نظام موحد: نفس هيدر/جدول/فلتر صفحة الاشتراك */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <BillingSectionTitle
            icon={History}
            title={activeTab === "activity" ? "السجل المالي" : "الفواتير الضريبية"}
            hint={`عرض ${activeList.length} عملية — اضغط على أي صف لنسخ رقم المعاملة`}
            extra={
              <div className="flex bg-[#111322] p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => { setActiveTab("activity"); setPage(1); setTxFilter("ALL"); setQuery(""); }}
                  className={`px-6 py-2.5 rounded-xl font-black transition-all text-xs flex items-center gap-2 ${activeTab === "activity" ? "bg-primary text-white shadow-lg" : "text-gray-500 hover:text-white"}`}
                >
                  <History className="w-4 h-4" />
                  السجل المالي
                </button>
                <button
                  onClick={() => { setActiveTab("invoices"); setPage(1); setTxFilter("ALL"); setQuery(""); }}
                  className={`px-6 py-2.5 rounded-xl font-black transition-all text-xs flex items-center gap-2 ${activeTab === "invoices" ? "bg-primary text-white shadow-lg" : "text-gray-500 hover:text-white"}`}
                >
                  <Receipt className="w-4 h-4" />
                  الفواتير
                </button>
              </div>
            }
          />

          <BillingFilterBar
            query={query}
            onQuery={(v) => { setQuery(v); setPage(1); }}
            searchPlaceholder={activeTab === "activity" ? "بحث في المعاملات بالوصف أو المبلغ..." : "بحث برقم الفاتورة أو القيمة..."}
            searchLabel="بحث في السجل المالي"
            tabs={activeTab === "activity"
              ? [{ value: "ALL", label: "الكل" }, { value: "IN", label: "وارد" }, { value: "OUT", label: "صادر" }, { value: "REFUND", label: `استرداد (${refundsSummary.count})` }]
              : [{ value: "ALL", label: "الكل" }, { value: "SUCCESS", label: "ناجحة" }, { value: "PENDING", label: "معلقة" }, { value: "FAILED", label: "فاشلة" }]}
            activeTab={txFilter}
            onTab={(v) => { setTxFilter(v); setPage(1); }}
            sortLabel={sortDir === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
            onSort={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            onRefresh={fetchData}
            onExport={handleExport}
            exportDisabled={activeList.length === 0}
          />

          <AnimatePresence mode="wait">
            {txFilter === "REFUND" && activeTab === "activity" && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm font-bold text-blue-500">
                <History className="w-4 h-4" />
                <span>
                  عمليات استرداد الأموال: {refundsSummary.count} — بإجمالي {refundsSummary.total.toLocaleString()} ج.م
                </span>
              </div>
            )}
            <m.div
              key={activeTab + txFilter + sortDir + safePage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activeTab === "activity" ? (
                pagedTransactions.length > 0 ? (
                  <>
                    <BillingTableShell headers={["الوصف", "القيمة", "الحالة", "التاريخ"]}>
                      {pagedTransactions.map((tx) => {
                        const type = typeMap[tx.type] || { label: tx.type, icon: Wallet, color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-500/10" };
                        return (
                          <tr key={tx.id} onClick={() => copyToClipboard(tx.id)} className="hover:bg-primary/5 transition-colors border-l-2 border-transparent hover:border-primary/40 cursor-pointer" title="اضغط لنسخ رقم المعاملة">
                            <td className="px-6 py-4 text-start">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${type.bg} ${type.color} flex items-center justify-center shrink-0`}>
                                  <type.icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 dark:text-white text-sm">{tx.description}</div>
                                  <div className="text-[10px] text-gray-500 font-bold">{type.label} • {format(new Date(tx.createdAt), "hh:mm a", { locale: ar })}</div>
                                </div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 font-black text-center whitespace-nowrap ${tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} ج.م
                            </td>
                            <td className="px-6 py-4 text-center">
                              <BillingStatusBadge status={tx.amount > 0 ? "SUCCESS" : "PENDING"} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold text-end whitespace-nowrap">
                              {format(new Date(tx.createdAt), "dd MMMM yyyy", { locale: ar })}
                            </td>
                          </tr>
                        );
                      })}
                    </BillingTableShell>
                    <BillingPagination page={safePage} totalPages={totalPages} onChange={setPage} />
                  </>
                ) : (
                  <BillingEmptyState icon={History} title={transactions.length === 0 ? "لا يوجد سجل معاملات حتى الآن" : "لا توجد نتائج مطابقة"} hint="جرّب تغيير البحث أو الفلتر، أو اشحن رصيدك لبدء أول معاملة." />
                )
              ) : pagedInvoices.length > 0 ? (
                <>
                  <BillingTableShell headers={["رقم الفاتورة", "القيمة", "الحالة", "التاريخ"]}>
                    {pagedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-primary/5 transition-colors border-l-2 border-transparent hover:border-primary/40">
                        <td className="px-6 py-4 text-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div className="font-black text-gray-900 dark:text-white text-sm" dir="ltr">{inv.invoiceNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-gray-900 dark:text-white text-center whitespace-nowrap">{inv.amount.toLocaleString()} ج.م</td>
                        <td className="px-6 py-4 text-center"><BillingStatusBadge status={inv.status} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold text-end whitespace-nowrap">
                          {format(new Date(inv.issueDate), "dd MMMM yyyy", { locale: ar })}
                        </td>
                      </tr>
                    ))}
                  </BillingTableShell>
                  <BillingPagination page={safePage} totalPages={totalPages} onChange={setPage} />
                </>
              ) : (
                <BillingEmptyState icon={Receipt} title="لا يوجد فواتير صادرة حالياً" hint="ستظهر فواتيرك الضريبية هنا بعد أول عملية دفع ناجحة." />
              )}
              <p className="mt-4 text-xs text-gray-500 font-bold">
                عرض {activeList.length > 0 ? pagedTransactions.length || pagedInvoices.length : 0} من أصل {activeList.length} عملية
              </p>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
           {/* Security Insight */}
           <div className="p-8 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent border border-emerald-500/20 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full group-hover:scale-110 transition-transform" />
              <ShieldCheck className="w-12 h-12 text-emerald-500 mb-6" />
              <h4 className="text-2xl font-black text-white mb-2 tracking-tight">أمان بنكي 100%</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">جميع معاملاتك مشفرة ومؤمنة بأحدث معايير الأمان العالمية لحمايتك.</p>
           </div>

           {/* Referrals Promo — نظام الإحالة الحقيقي بدل الولاء الوهمي */}
           <Link
             href="/billing/referrals"
             className="block p-8 rounded-[3rem] bg-gradient-to-br from-amber-500/20 via-primary/10 to-transparent border border-amber-500/10 hover:border-amber-500/40 transition-all group"
           >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-black text-white">برنامج الإحالة</h4>
              </div>
              <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">
                ادعُ أصدقاءك للمنصة واكسب <span className="text-emerald-400 font-black">20 ج.م</span> في محفظتك عن كل صديق يشترك بكودك — بلا حد أقصى.
              </p>
              <span className="block w-full py-4 rounded-2xl bg-white text-gray-900 font-black text-sm text-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                انسخ كود الدعوة
              </span>
           </Link>

           {/* Support */}
           <div className="p-8 rounded-[3rem] bg-[#111322] border border-white/5 flex flex-col items-center text-center gap-6 group">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <Zap className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xl font-black text-white">دعم مالي فني</h4>
                 <p className="text-xs text-gray-500 font-medium">فريقنا متواجد 24/7 لمساعدتك في أي استفسار مالي.</p>
              </div>
              <Link href="/support" className="text-primary font-black text-sm hover:underline">تحدث معنا الآن</Link>
           </div>
        </div>
      </div>
    </div>);

}