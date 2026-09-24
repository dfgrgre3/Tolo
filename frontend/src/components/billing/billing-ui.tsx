"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, Search, RefreshCw, ArrowUpDown, FileDown, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/* ── رأس الصفحة الموحد (نفس ستايل billing/page.tsx) ── */
export const BillingPageHeader = React.memo(function BillingPageHeader({
  badge,
  BadgeIcon,
  title,
  description,
  action,
}: {
  badge: string;
  BadgeIcon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 lg:gap-10 mb-10 lg:mb-16">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-black text-xs md:text-sm uppercase tracking-widest bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20">
          <BadgeIcon className="w-4 h-4" />
          <span>{badge}</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl xl:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">
            {title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-base md:text-xl max-w-xl leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
});

/* ── كارت إحصائية موحد ── */
export const BillingStatCard = React.memo(function BillingStatCard({
  icon: Icon,
  iconWrap,
  topLabel,
  topLabelClass = "text-gray-400",
  value,
  hint,
}: {
  icon: LucideIcon;
  iconWrap: string;
  topLabel: string;
  topLabelClass?: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div
      className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>
          <Icon size={20} />
        </div>
        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${topLabelClass}`}>
          {topLabel}
        </span>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-gray-500 dark:text-gray-400 text-xs font-medium">{hint}</div>
    </div>
  );
});

/* ── شارة الحالة الموحدة ── */
const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  CANCELLED: "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "ناجحة",
  COMPLETED: "مكتملة",
  PAID: "مدفوعة",
  PENDING: "قيد الانتظار",
  FAILED: "فشلت",
  CANCELLED: "ملغية",
};

export const BillingStatusBadge = React.memo(function BillingStatusBadge({ status }: { status: string }) {
  const key = (status || "").toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border whitespace-nowrap ${
        STATUS_STYLES[key] ?? "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[key] ?? status}
    </span>
  );
});

/* ── حالة فارغة موحدة (B-11: delegate للمركزي، نفس التوقيع) ── */
export const BillingEmptyState = React.memo(function BillingEmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <EmptyState title={title} description={hint} icon={Icon} action={action} />
  );
});

export const BillingTableShell = React.memo(function BillingTableShell({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <div className="overflow-x-auto">
        <table className="w-full text-start" dir="rtl">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-4 text-sm font-black text-gray-500 dark:text-gray-400 whitespace-nowrap ${
                    i === 0 ? "text-start" : i === headers.length - 1 ? "text-end" : "text-center"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">{children}</tbody>
        </table>
      </div>
    </div>
  );
});

export { Inbox };

/* ── ترقيم صفحات موحد ── */
export const BillingPagination = React.memo(function BillingPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const nums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1
  );
  return (
    <div className="flex items-center justify-center gap-2 mt-6" dir="rtl" role="navigation" aria-label="ترقيم الصفحات">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40"
      >
        السابق
      </button>
      {nums.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && nums[i - 1] !== n - 1 && <span className="text-gray-400">…</span>}
          <button
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`w-10 h-10 rounded-xl text-sm font-black ${
              n === page
                ? "bg-primary text-white shadow-lg"
                : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10"
            }`}
          >
            {n}
          </button>
        </React.Fragment>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40"
      >
        التالي
      </button>
    </div>
  );
});

/* ── شريط فلاتر موحد: بحث + تبويبات حالة + ترتيب + تحديث + تصدير ── */
export const BillingFilterBar = React.memo(function BillingFilterBar({
  query,
  onQuery,
  searchPlaceholder = "بحث...",
  searchLabel = "بحث",
  tabs,
  activeTab,
  onTab,
  sortLabel,
  onSort,
  onRefresh,
  refreshing = false,
  onExport,
  exportDisabled = false,
}: {
  query: string;
  onQuery: (v: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  tabs: { value: string; label: string }[];
  activeTab: string;
  onTab: (v: string) => void;
  sortLabel?: string;
  onSort?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onExport?: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className="space-y-3 mb-6" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-2.5 pr-11 pl-10 text-sm text-gray-900 dark:text-white font-bold outline-none focus:border-primary/50 w-full placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>
        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 w-fit" role="tablist" aria-label="فلتر الحالة">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => onTab(t.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black whitespace-nowrap ${
                activeTab === t.value ? "bg-primary text-white shadow-lg" : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {(sortLabel || onRefresh || onExport) && (
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              تحديث
            </button>
          )}
          {sortLabel && onSort && (
            <button
              onClick={onSort}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
            >
              <ArrowUpDown size={14} />
              {sortLabel}
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              disabled={exportDisabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-black text-primary hover:bg-primary hover:text-white disabled:opacity-40"
            >
              <FileDown size={14} />
              تصدير CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
});

/* ── حالات التحميل والخطأ الموحدة ── */
export const BillingLoadingGrid = React.memo(function BillingLoadingGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="h-10 w-64 bg-white/10 rounded-full" />
        <div className="h-20 w-2/3 bg-white/5 rounded-[2rem]" />
        <div className={`grid grid-cols-1 md:grid-cols-2 ${cards > 2 ? "lg:grid-cols-4" : ""} gap-6`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="h-40 bg-white/5 rounded-[2rem] border border-white/10" />
          ))}
        </div>
        <div className="h-96 bg-white/5 rounded-[2.5rem] border border-white/10" />
      </div>
    </div>
  );
});

export const BillingErrorState = React.memo(function BillingErrorState({
  title,
  hint,
  debugCode,
  onRetry,
  loginLink = false,
}: {
  title: string;
  hint: string;
  debugCode?: string;
  onRetry?: () => void;
  loginLink?: boolean;
}) {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4" dir="rtl">
      <div className="text-center bg-white dark:bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-lg w-full">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-rose-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">{hint}</p>
        <div className="flex flex-col gap-3">
          {loginLink ? (
            <a href="/login" className="px-8 py-3 bg-white text-gray-900 rounded-2xl font-black hover:bg-gray-200 text-center">
              تسجيل الدخول
            </a>
          ) : onRetry ? (
            <button onClick={onRetry} className="px-8 py-3 bg-primary text-white rounded-2xl font-black hover:bg-primary/90">
              إعادة المحاولة
            </button>
          ) : null}
          <a href="/" className="text-gray-500 hover:text-white text-sm text-center font-bold">
            العودة للرئيسية
          </a>
        </div>
        {debugCode && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <code className="text-[10px] text-gray-500 bg-black/30 px-2 py-1 rounded">Debug Code: {debugCode}</code>
          </div>
        )}
      </div>
    </div>
  );
});

/* ── تنسيق العملة المصري الموحد ── */
export function formatEGP(value: number): string {
  return `${(value ?? 0).toLocaleString("ar-EG")} ج.م`;
}

/* ── تصدير CSV ── */
export function exportToCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["\uFEFF" + headers.map(esc).join(",")]
    .concat(rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── عنوان قسم موحد ── */
export const BillingSectionTitle = React.memo(function BillingSectionTitle({
  icon: Icon,
  title,
  hint,
  extra,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6" dir="rtl">
      <div className="text-start">
        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Icon size={20} className="text-primary shrink-0" />
          {title}
        </h2>
        {hint && <p className="text-gray-500 text-sm font-medium mt-1">{hint}</p>}
      </div>
      {extra}
    </div>
  );
});
