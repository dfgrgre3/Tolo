"use client";

import React, { useState, useEffect, useMemo } from "react";
import { m } from "framer-motion";
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
  GraduationCap,
  Search,
  Receipt,
  Crown,
  RefreshCw,
  Eye,
  FileDown,
  ArrowUpDown,
  X,
} from "lucide-react";

import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { InvoiceTemplate } from "@/components/billing/invoice-template";
import { generateInvoicePDF } from "@/utils/billing/generate-pdf";
import {
  BillingPageHeader,
  BillingStatCard,
  BillingStatusBadge,
  BillingEmptyState,
  BillingTableShell,
  BillingPagination,
  BillingSectionTitle,
  BillingFilterBar,
  BillingLoadingGrid,
  BillingErrorState,
  exportToCsv,
} from "@/components/billing/billing-ui";
import { logger } from "@/lib/logger";

interface ActiveSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  plan: { name: string; nameAr: string; price: number };
  payments?: { provider: string }[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  transactionId: string | null;
  orderId: string | null;
  type?: string | null;
  kind?: string | null;
  refundStatus?: string | null;
  refundedAt?: string | null;
  refundAmount?: number | null;
  discountAmountValue?: number;
  promoDiscount?: number;
  prorationDiscount?: number;
  balanceUsed?: number;
  discountAmount?: number;
  subscription?: { plan?: { nameAr?: string } };
}

function isRefundPayment(p: PaymentRecord): boolean {
  const hay = `${p.status ?? ""} ${p.type ?? ""} ${p.kind ?? ""} ${p.refundStatus ?? ""}`.toUpperCase();
  return (
    hay.includes("REFUND") ||
    hay.includes("REFUNDED") ||
    p.refundAmount != null ||
    p.refundedAt != null ||
    (p.amount < 0 && (p.type ?? "").toUpperCase().includes("REFUND"))
  );
}

function isSubscriptionPayment(p: PaymentRecord): boolean {
  if (isRefundPayment(p)) return false;
  const kind = `${p.kind ?? ""} ${p.type ?? ""}`.toUpperCase();
  if (kind.includes("SUBSCRIPTION")) return true;
  return Boolean(p.subscription?.plan?.nameAr);
}

function normalizeHistoryRecord(raw: unknown, index: number): PaymentRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const id = str(r.id) ?? str(r.paymentId) ?? `pay-${index}`;
  const amount =
    num(r.amount) ?? num(r.finalAmount) ?? num(r.totalAmount) ?? 0;
  const createdAt =
    str(r.createdAt) ?? str(r.created_at) ?? str(r.date) ?? new Date().toISOString();
  return {
    id,
    amount,
    status: str(r.status) ?? "UNKNOWN",
    createdAt,
    paymentMethod: str(r.paymentMethod) ?? str(r.payment_method) ?? str(r.method),
    transactionId: str(r.transactionId) ?? str(r.transaction_id),
    orderId: str(r.orderId) ?? str(r.order_id),
    type: str(r.type),
    kind: str(r.kind),
    refundStatus: str(r.refundStatus) ?? str(r.refund_status),
    refundedAt: str(r.refundedAt) ?? str(r.refunded_at),
    refundAmount: num(r.refundAmount) ?? num(r.refund_amount),
    subscription: (r.subscription ?? undefined) as PaymentRecord["subscription"],
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

function normalizeBillingSummary(value: unknown): BillingSummary {
  const unwrapped =
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "data" in value &&
    (value as { success?: boolean; data?: unknown }).data !== undefined
      ? (value as { data: unknown }).data
      : value;

  const raw = (unwrapped ?? {}) as Partial<BillingSummary> & Record<string, unknown>;
  const stats = raw.stats ?? {};
  const active = (raw.activeSubscription ?? null) as ActiveSubscription | null;

  return {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    balance: typeof raw.balance === "number" ? raw.balance : 0,
    additionalAiCredits:
      typeof raw.additionalAiCredits === "number" ? raw.additionalAiCredits : 0,
    additionalExamCredits:
      typeof raw.additionalExamCredits === "number" ? raw.additionalExamCredits : 0,
    activeSubscription: active,
    paymentHistory: Array.isArray(raw.paymentHistory) ? raw.paymentHistory : [],
    stats: {
      totalSpent: typeof (stats as { totalSpent?: unknown }).totalSpent === "number"
        ? (stats as { totalSpent: number }).totalSpent : 0,
      paymentCount: typeof (stats as { paymentCount?: unknown }).paymentCount === "number"
        ? (stats as { paymentCount: number }).paymentCount : 0,
      successCount: typeof (stats as { successCount?: unknown }).successCount === "number"
        ? (stats as { successCount: number }).successCount : 0,
      pendingCount: typeof (stats as { pendingCount?: unknown }).pendingCount === "number"
        ? (stats as { pendingCount: number }).pendingCount : 0,
      failedCount: typeof (stats as { failedCount?: unknown }).failedCount === "number"
        ? (stats as { failedCount: number }).failedCount : 0,
    },
  };
}

type InvoiceFilter = "ALL" | "SUCCESS" | "PENDING" | "FAILED";
type HistoryTab = "ALL" | "PURCHASES" | "SUBSCRIPTIONS" | "REFUNDS";

export default function SubscriptionPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("ALL");
  const [historyTab, setHistoryTab] = useState<HistoryTab>("ALL");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<PaymentRecord | null>(null);
  const [pdfTarget, setPdfTarget] = useState<PaymentRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [subAction, setSubAction] = useState<"cancel" | "renew" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const PAGE_SIZE = 8;

  /** تحميل فاتورة من الجدول: نrender قالباً مخفياً واحداً ثم نلتقطه PDF. */
  const handleDownloadInvoice = (payment: PaymentRecord) => {
    if (preview?.id === payment.id) {
      // المعاينة مفتوحة already — القالب المرئي جاهز للالتقاط مباشرة.
      generateInvoicePDF(`invoice-${payment.id}`, `invoice-${payment.id}`);
      return;
    }
    setPdfTarget(payment);
    // مهلة paint واحدة حتى يُبنى القالب المخفي قبل الالتقاط.
    setTimeout(() => {
      generateInvoicePDF(`invoice-${payment.id}`, `invoice-${payment.id}`);
      setTimeout(() => setPdfTarget(null), 1000);
    }, 350);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const updated = await apiClient.get<BillingSummary>(apiRoutes.users.billingSummary);
      setSummary(normalizeBillingSummary(updated));
      toast.success("تم تحديث البيانات");
    } catch {
      toast.error("تعذر التحديث — تحقق من الاتصال");
    } finally {
      setRefreshing(false);
    }
  };

  const reloadSummarySilent = async () => {
    try {
      const updated = await apiClient.get<BillingSummary>(apiRoutes.users.billingSummary);
      setSummary(normalizeBillingSummary(updated));
    } catch {
      // يبقى الملخص الحالي — الخطأ يُعرض عبر toast الإجراء نفسه
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setSubAction("cancel");
    try {
      await apiClient.post(apiRoutes.subscriptions.cancel, {});
      toast.success("تم إلغاء الاشتراك");
      setConfirmingCancel(false);
      await reloadSummarySilent();
    } catch {
      toast.error("تعذر إلغاء الاشتراك — حاول مرة أخرى");
    } finally {
      setSubAction(null);
    }
  };

  const handleRenewSubscription = async () => {
    setSubAction("renew");
    try {
      await apiClient.post(apiRoutes.subscriptions.renew, {});
      toast.success("تم تجديد الاشتراك بنجاح");
      await reloadSummarySilent();
    } catch {
      toast.error("تعذر تجديد الاشتراك — حاول مرة أخرى");
    } finally {
      setSubAction(null);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [, summaryData, addonsData, historyData] = await Promise.allSettled([
          Promise.resolve(),
          apiClient.get<BillingSummary>(apiRoutes.users.billingSummary),
          apiClient.get<unknown>(apiRoutes.subscriptions.addons),
          apiClient.get<unknown>(apiRoutes.payments.history),
        ]);

        if (summaryData.status === "fulfilled") {
          const base = normalizeBillingSummary(summaryData.value);
          // دمج سجل المدفوعات العام (مشتريات + استرداد) مع ملخص الفوترة
          if (historyData.status === "fulfilled") {
            const hv: unknown = historyData.value;
            const unwrapped =
              hv && typeof hv === "object" && !Array.isArray(hv) && "data" in (hv as Record<string, unknown>)
                ? (hv as { data: unknown }).data
                : hv;
            const rawList = Array.isArray(unwrapped)
              ? unwrapped
              : unwrapped && typeof unwrapped === "object" && Array.isArray((unwrapped as { payments?: unknown }).payments)
                ? (unwrapped as { payments: unknown[] }).payments
                : unwrapped && typeof unwrapped === "object" && Array.isArray((unwrapped as { history?: unknown }).history)
                  ? (unwrapped as { history: unknown[] }).history
                  : [];
            const seen = new Set(base.paymentHistory.map((p) => p.id));
            rawList.forEach((item, i) => {
              const rec = normalizeHistoryRecord(item, i);
              if (rec && !seen.has(rec.id)) {
                seen.add(rec.id);
                base.paymentHistory.push(rec);
              }
            });
          }
          setSummary(base);
        } else {
          const err = summaryData.reason instanceof ApiError ? summaryData.reason : null;
          if (err?.status === 401) setError("unauthorized");
          else setError(`failed_fetch_${err?.status ?? "unknown"}`);
        }

        if (addonsData.status === "fulfilled") {
          const raw = addonsData.value as
            | { addons?: Addon[]; data?: unknown }
            | Addon[]
            | null
            | undefined;
          const payload = (raw as { data?: unknown })?.data ?? raw;
          const list = Array.isArray(payload)
            ? payload
            : (payload as { addons?: Addon[] })?.addons ?? [];
          setAddons(list);
        }
      } catch (err: unknown) {
        logger.error(err instanceof Error ? err.message : String(err));
        setError("network_error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handlePurchaseAddon = async (addonId: string) => {
    setPurchasing(addonId);
    try {
      await apiClient.post(apiRoutes.subscriptions.addons, { addonId });
      toast.success("تمت عملية الشراء بنجاح!");
      const updated = await apiClient.get<BillingSummary>(apiRoutes.users.billingSummary);
      setSummary(normalizeBillingSummary(updated));
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      const msg =
        (apiErr?.data as { error?: string } | undefined)?.error ||
        apiErr?.message ||
        "فشلت عملية الشراء";
      toast.error(msg);
      logger.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPurchasing(null);
    }
  };

  const historyCounts = useMemo(() => {
    if (!summary) return { purchases: 0, subscriptions: 0, refunds: 0, refundsTotal: 0 };
    let purchases = 0;
    let subscriptions = 0;
    let refunds = 0;
    let refundsTotal = 0;
    for (const p of summary.paymentHistory) {
      if (isRefundPayment(p)) {
        refunds += 1;
        refundsTotal += Math.abs(p.refundAmount ?? p.amount ?? 0);
      } else if (isSubscriptionPayment(p)) {
        subscriptions += 1;
      } else {
        purchases += 1;
      }
    }
    return { purchases, subscriptions, refunds, refundsTotal };
  }, [summary]);

  const filteredPayments = useMemo(() => {
    if (!summary) return [];
    const q = query.trim();
    const list = summary.paymentHistory.filter((p) => {
      const refund = isRefundPayment(p);
      if (historyTab === "PURCHASES" && (refund || isSubscriptionPayment(p))) return false;
      if (historyTab === "SUBSCRIPTIONS" && (refund || !isSubscriptionPayment(p))) return false;
      if (historyTab === "REFUNDS" && !refund) return false;
      if (filter !== "ALL" && (p.status || "").toUpperCase() !== filter) return false;
      if (!q) return true;
      const hay = `${p.subscription?.plan?.nameAr ?? ""} ${p.transactionId ?? ""} ${p.orderId ?? ""} ${p.amount} ${p.type ?? ""} ${p.kind ?? ""} ${p.refundStatus ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt)
    );
  }, [summary, query, filter, historyTab, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPayments = filteredPayments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, filter, historyTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleExportCsv = () => {
    if (!summary) return;
    exportToCsv(
      "invoices",
      filteredPayments.map((p) => ({
        "نوع السجل": isRefundPayment(p) ? "استرداد" : isSubscriptionPayment(p) ? "اشتراك" : "شراء",
        "الخطة": p.subscription?.plan?.nameAr || "رصيد / شحن",
        "القيمة (ج.م)": p.refundAmount ?? p.amount,
        "الحالة": p.refundStatus || p.status,
        "التاريخ": format(new Date(p.createdAt), "yyyy-MM-dd", { locale: ar }),
        "طريقة الدفع": p.paymentMethod || "",
        "رقم العملية": p.transactionId || "",
      }))
    );
    toast.success("تم تصدير الفواتير CSV");
  };

  if (loading) {
    return <BillingLoadingGrid cards={4} />;
  }

  if (error || !summary) {
    return (
      <BillingErrorState
        title={error === "unauthorized" ? "يجب تسجيل الدخول" : "حدث خطأ في جلب البيانات"}
        hint={
          error === "unauthorized"
            ? "يرجى تسجيل الدخول لعرض ملخص حسابك وفواتيرك."
            : error?.startsWith("failed_fetch_404")
              ? "لم يتم العثور على رابط البيانات. تأكد من تشغيل السيرفر وتحديثه."
              : "لا يمكننا الوصول إلى السيرفر حالياً. يرجى التحقق من اتصالك بالإنترنت."
        }
        debugCode={error && error !== "unauthorized" ? error : undefined}
        onRetry={error === "unauthorized" ? undefined : () => window.location.reload()}
        loginLink={error === "unauthorized"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
      <BillingPageHeader
        badge="نظرة عامة على الحساب"
        BadgeIcon={LayoutDashboard}
        title="الاشتراك والفواتير"
        description="تحكم كامل في خطتك الحالية، رصيدك، متجر الإضافات، وسجل فواتيرك في مكان واحد آمن."
        action={
          <Link
            href="/billing?tab=upgrade"
            className="px-8 py-4 bg-primary hover:bg-primary/90 rounded-[2rem] font-black text-white flex items-center gap-2 transition-all shadow-[0_20px_50px_rgba(var(--primary-rgb),0.4)] active:scale-95"
          >
            تجديد أو ترقية الاشتراك
            <ArrowUpRight size={18} />
          </Link>
        }
      />

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Stats Grid — نفس ستايل billing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <BillingStatCard
            icon={Wallet}
            iconWrap="bg-primary/15 text-primary"
            topLabel="رصيدك الحالي"
            topLabelClass="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            value={<>{summary.balance.toLocaleString()} <span className="text-sm text-gray-500 font-bold">ج.م</span></>}
            hint="متاح للاستخدام في المنصة"
            delay={0}
          />
          <BillingStatCard
            icon={TrendingUp}
            iconWrap="bg-purple-500/10 text-purple-400"
            topLabel="إجمالي المدفوعات"
            value={<>{summary.stats.totalSpent.toLocaleString()} <span className="text-sm text-gray-500 font-bold">ج.م</span></>}
            hint="مجموع العمليات الناجحة"
            delay={0.05}
          />
          <BillingStatCard
            icon={CheckCircle2}
            iconWrap="bg-emerald-500/10 text-emerald-400"
            topLabel="عمليات ناجحة"
            value={summary.stats.successCount}
            hint="عمليات مكتملة بنجاح"
            delay={0.1}
          />
          <BillingStatCard
            icon={XCircle}
            iconWrap="bg-rose-500/10 text-rose-400"
            topLabel="معلقة / فاشلة"
            value={summary.stats.pendingCount + summary.stats.failedCount}
            hint="تحتاج لمراجعة"
            delay={0.15}
          />
        </div>

        {/* Credits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Bot, wrap: "bg-primary/15 text-primary", label: "رصيد المساعد الذكي (AI)", val: summary.additionalAiCredits, unit: "رسالة إضافية" },
            { icon: GraduationCap, wrap: "bg-emerald-500/10 text-emerald-400", label: "رصيد الامتحانات الإضافية", val: summary.additionalExamCredits, unit: "محاولة" },
          ].map((c) => (
            <div key={c.label} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-xl p-6 rounded-[2rem] relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.wrap}`}>
                  <c.icon size={24} />
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 dark:text-gray-400 font-black">{c.label}</h4>
                  <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {c.val} <span className="text-xs text-gray-500 font-medium">{c.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Addons */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">متجر الإضافات السريعة</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">اشحن رصيدك بإضافات لمرة واحدة لدعم رحلتك التعليمية</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10">
              <Wallet size={16} className="text-primary" />
              <span className="text-sm font-black text-gray-900 dark:text-white">{summary.balance} ج.م</span>
            </div>
          </div>

          {addons.length === 0 ? (
            <BillingEmptyState icon={Zap} title="لا توجد إضافات متاحة حالياً" hint="تحقق لاحقاً — نضيف عروضاً جديدة باستمرار." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <m.div
                  key={addon.id}
                  whileHover={{ y: -8 }}
                  className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 flex flex-col items-center text-center group relative overflow-hidden hover:border-primary/30 hover:shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.25)] transition-all"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                  <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${
                    addon.type === "EXAM_PACK" ? "bg-purple-500/10 text-purple-400" :
                    addon.type === "AI_CREDITS" ? "bg-primary/10 text-primary" :
                    "bg-emerald-500/10 text-emerald-400"}`}>
                    {addon.type === "EXAM_PACK" ? <GraduationCap size={32} /> :
                     addon.type === "AI_CREDITS" ? <Bot size={32} /> : <BookOpen size={32} />}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{addon.nameAr || addon.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-6 max-w-[220px] line-clamp-2">{addon.description}</p>
                  <div className="mt-auto w-full">
                    <div className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                      {addon.price} <span className="text-xs text-gray-500 font-bold">ج.م</span>
                    </div>
                    <button
                      onClick={() => handlePurchaseAddon(addon.id)}
                      disabled={purchasing === addon.id || summary.balance < addon.price}
                      className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        summary.balance < addon.price
                          ? "bg-gray-50 dark:bg-white/5 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10"
                          : "bg-white text-gray-900 hover:bg-primary hover:text-white shadow-lg"}`}
                    >
                      {purchasing === addon.id ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>{summary.balance < addon.price ? "الرصيد غير كافٍ" : "شراء الآن"} <ArrowUpRight size={16} /></>
                      )}
                    </button>
                  </div>
                </m.div>
              ))}
            </div>
          )}
        </section>

        {/* Current subscription + Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Crown size={20} className="text-amber-400" />
              الاشتراك الحالي
            </h2>
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-purple-600 to-primary/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all" />
              {summary.activeSubscription ? (
                <>
                  <div className="mb-6 relative">
                    <span className="text-white/60 text-sm font-black uppercase tracking-wider">خطة {summary.activeSubscription.plan?.nameAr || "الاشتراك"}</span>
                    <h3 className="text-4xl font-black text-white mt-1">نشط</h3>
                  </div>
                  <div className="space-y-4 mb-8 relative">
                    <div className="flex items-center gap-3 text-white/80">
                      <Calendar size={18} />
                      <span className="text-sm font-bold">تاريخ الانتهاء: {format(new Date(summary.activeSubscription.endDate), "dd MMMM yyyy", { locale: ar })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/80">
                      <ShieldCheck size={18} />
                      <span className="text-sm font-bold">دفع مؤمن عبر {summary.activeSubscription.payments?.[0]?.provider || "Paymob"}</span>
                    </div>
                  </div>
                  <Link href="/dashboard" className="relative w-full py-4 bg-white text-primary rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                    فتح لوحة الطالب
                  </Link>
                  <div className="relative mt-3 flex gap-2">
                    <button
                      onClick={handleRenewSubscription}
                      disabled={subAction !== null}
                      className="flex-1 py-3 rounded-2xl bg-white/15 border border-white/25 text-white text-sm font-black hover:bg-white/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={15} className={subAction === "renew" ? "animate-spin" : ""} />
                      {subAction === "renew" ? "جاري التجديد..." : "تجديد الاشتراك"}
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      onBlur={() => setConfirmingCancel(false)}
                      disabled={subAction !== null}
                      className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                        confirmingCancel
                          ? "bg-rose-600 text-white hover:bg-rose-500"
                          : "bg-black/20 border border-white/15 text-white/80 hover:bg-black/30"
                      }`}
                    >
                      <X size={15} />
                      {subAction === "cancel"
                        ? "جاري الإلغاء..."
                        : confirmingCancel
                          ? "تأكيد الإلغاء؟"
                          : "إلغاء الاشتراك"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 relative">
                  <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-white/60" />
                  </div>
                  <p className="text-white font-black mb-6">لا يوجد اشتراك نشط حالياً</p>
                  <Link href="/billing?tab=upgrade" className="px-6 py-3 bg-white text-primary rounded-2xl font-black">اشترك الآن</Link>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <BillingSectionTitle
              icon={History}
              title="سجل الشراء والاشتراكات والاسترداد"
              hint={`عرض ${pagedPayments.length} من أصل ${filteredPayments.length} عملية`}
            />
            {/* تبويبات نوع السجل */}
            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="نوع السجل">
              {(
                [
                  { value: "ALL", label: `الكل (${summary.paymentHistory.length})` },
                  { value: "PURCHASES", label: `سجل الشراء (${historyCounts.purchases})` },
                  { value: "SUBSCRIPTIONS", label: `الاشتراكات (${historyCounts.subscriptions})` },
                  { value: "REFUNDS", label: `الاسترداد (${historyCounts.refunds})` },
                ] as { value: HistoryTab; label: string }[]
              ).map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={historyTab === t.value}
                  onClick={() => setHistoryTab(t.value)}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition-all active:scale-95 ${
                    historyTab === t.value
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 hover:border-primary/40 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {historyTab === "REFUNDS" && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                <History size={16} />
                <span>
                  إجمالي عمليات الاسترداد: {historyCounts.refunds} — بقيمة {historyCounts.refundsTotal.toLocaleString()} ج.م
                </span>
              </div>
            )}
            <BillingFilterBar
              query={query}
              onQuery={setQuery}
              searchPlaceholder="بحث برقم العملية أو الخطة..."
              searchLabel="بحث في الفواتير"
              tabs={[
                { value: "ALL", label: "الكل" },
                { value: "SUCCESS", label: "ناجحة" },
                { value: "PENDING", label: "معلقة" },
                { value: "FAILED", label: "فاشلة" },
              ]}
              activeTab={filter}
              onTab={(v) => setFilter(v as InvoiceFilter)}
              sortLabel={sortDir === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
              onSort={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              onRefresh={refresh}
              refreshing={refreshing}
              onExport={handleExportCsv}
              exportDisabled={filteredPayments.length === 0}
            />

            {filteredPayments.length === 0 ? (
              <BillingEmptyState
                icon={Receipt}
                title={summary.paymentHistory.length === 0 ? "لا توجد أي عمليات دفع حتى الآن" : "لا توجد نتائج مطابقة"}
                hint="جرّب تغيير البحث أو الفلتر، أو ابدأ أول عملية شحن من صفحة الفواتير."
                action={
                  <Link href="/billing" className="px-6 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all">
                    الذهاب للمركز المالي
                  </Link>
                }
              />
            ) : (
              <>
                <BillingTableShell headers={["الخطة", "القيمة", "الحالة", "التاريخ", "الفاتورة", "رقم العملية"]}>
                  {pagedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-primary/5 transition-colors border-l-2 border-transparent hover:border-primary/40">
                      <td className="px-6 py-4 text-start">
                        <div className="font-black text-gray-900 dark:text-white">{payment.subscription?.plan?.nameAr || "رصيد / شحن"}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{payment.paymentMethod || "Card"}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 dark:text-white text-center whitespace-nowrap">{payment.amount} ج.م</td>
                      <td className="px-6 py-4 text-center">
                        {isRefundPayment(payment) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-black text-blue-500">
                            <History size={11} />
                            استرداد
                          </span>
                        ) : (
                          <BillingStatusBadge status={payment.status} />
                        )}
                        {(payment.status || "").toUpperCase() === "PENDING" && (
                          <div className="mt-1 flex justify-center"><Clock size={10} className="text-amber-400" /></div>
                        )}
                        {isRefundPayment(payment) && payment.refundedAt && (
                          <div className="mt-1 text-[10px] text-gray-500 font-bold">
                            {format(new Date(payment.refundedAt), "dd MMMM yyyy", { locale: ar })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold text-end whitespace-nowrap">
                        {format(new Date(payment.createdAt), "dd MMMM yyyy", { locale: ar })}
                      </td>
                      <td className="px-6 py-4 text-start">
                        <div className="flex justify-center gap-2">
                          {(payment.status || "").toUpperCase() === "SUCCESS" ? (
                            <>
                              <button
                                onClick={() => setPreview(payment)}
                                className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
                                title="معاينة الفاتورة"
                                aria-label={`معاينة فاتورة ${payment.id}`}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleDownloadInvoice(payment)}
                                className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-95"
                                title="تحميل الفاتورة"
                                aria-label={`تحميل فاتورة ${payment.id}`}
                              >
                                <Download size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-700 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-gray-500 text-end" dir="ltr">
                        <span title={payment.transactionId || ""}>
                          {payment.transactionId ? `${payment.transactionId.slice(0, 10)}...` : "---"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </BillingTableShell>
                <BillingPagination page={safePage} totalPages={totalPages} onChange={setPage} />
              </>
            )}
            <p className="mt-4 text-xs text-gray-500 font-bold">
              عرض {pagedPayments.length} من أصل {filteredPayments.length} عملية (الإجمالي {summary.paymentHistory.length})
            </p>

            {/* قالب مخفي واحد فقط عند الطلب — بدل render كل الفواتير الناجحة
                (كان يولّد N قالب + N رمز QR عند كل تحميل للصفحة). */}
            {pdfTarget && (
              <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none" aria-hidden>
                <InvoiceTemplate
                  data={{
                    paymentId: pdfTarget.id,
                    orderId: pdfTarget.orderId || "",
                    customerName: summary.name,
                    customerEmail: summary.email,
                    planName: pdfTarget.subscription?.plan?.nameAr || "رصيد / شحن",
                    amount: pdfTarget.amount + (pdfTarget.discountAmountValue || 0),
                    discountAmount: pdfTarget.discountAmountValue,
                    promoDiscount: pdfTarget.promoDiscount,
                    prorationDiscount: pdfTarget.prorationDiscount,
                    balanceUsed: pdfTarget.balanceUsed,
                    finalAmount: pdfTarget.amount,
                    date: pdfTarget.createdAt,
                    paymentMethod: pdfTarget.paymentMethod || "Card",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-10 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>تشفير بيانات بنكي (256-bit SSL)</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 hidden md:block" />
          <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
            <Clock className="w-5 h-5 text-primary" />
            <span>تفعيل فوري لجميع الباقات</span>
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="معاينة الفاتورة">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4" dir="rtl">
              <h3 className="font-black text-gray-900">معاينة الفاتورة</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateInvoicePDF(`invoice-${preview.id}`, `invoice-${preview.id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all"
                >
                  <Download size={14} />
                  تحميل PDF
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                  aria-label="إغلاق المعاينة"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <InvoiceTemplate
              data={{
                paymentId: preview.id,
                orderId: preview.orderId || "",
                customerName: summary.name,
                customerEmail: summary.email,
                planName: preview.subscription?.plan?.nameAr || "رصيد / شحن",
                amount: preview.amount + (preview.discountAmountValue || 0),
                discountAmount: preview.discountAmountValue,
                promoDiscount: preview.promoDiscount,
                prorationDiscount: preview.prorationDiscount,
                balanceUsed: preview.balanceUsed,
                finalAmount: preview.amount,
                date: preview.createdAt,
                paymentMethod: preview.paymentMethod || "Card",
              }}
            />
          </m.div>
        </div>
      )}
    </div>
  );
}
