"use client";

import React, { useState, useEffect } from "react";
import { m } from "framer-motion";
import {
  Users,
  Gift,
  Share2,
  Copy,
  CheckCircle2,
  TrendingUp,
  Wallet,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { logger } from "@/lib/logger";
import { fetchReferralStatsRaw } from "@/features/payments/api/payments-gateway";
import {
  BillingPageHeader,
  BillingStatCard,
  BillingEmptyState,
  BillingTableShell,
  BillingFilterBar,
  BillingPagination,
  BillingSectionTitle,
  exportToCsv,
} from "@/components/billing/billing-ui";

interface ReferralReward {
  id: string;
  referred?: { name?: string };
  amount: number;
  createdAt: string;
}

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  totalEarned: number;
  pendingRewards: number;
  history: ReferralReward[];
}

/* تطبيع استجابة الـ API — نفس نهج normalizeBillingSummary في صفحة الاشتراك:
   أي حقل ناقص يُستبدل بقيمة آمنة بدل أن يسقط الصفحة بـ TypeError. */
function normalizeReferralStats(value: unknown): ReferralStats {
  const unwrapped =
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "data" in value &&
    (value as { success?: boolean; data?: unknown }).data !== undefined
      ? (value as { data: unknown }).data
      : value;
  const raw = (unwrapped ?? {}) as Partial<ReferralStats> & Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const history = Array.isArray(raw.history) ? raw.history : [];
  return {
    referralCode: typeof raw.referralCode === "string" ? raw.referralCode : "",
    referralCount: num(raw.referralCount),
    totalEarned: num(raw.totalEarned),
    pendingRewards: num(raw.pendingRewards),
    history: history.map((r) => ({
      id: typeof (r as ReferralReward)?.id === "string" ? (r as ReferralReward).id : Math.random().toString(36).slice(2),
      referred: (r as ReferralReward)?.referred,
      amount: num((r as ReferralReward)?.amount),
      createdAt: typeof (r as ReferralReward)?.createdAt === "string" ? (r as ReferralReward).createdAt : new Date().toISOString(),
    })),
  };
}

/* زر المشاركة عبر النظام — مكوّن مستقل حتى لا يبقى أي وصول غير مؤمّن
   لـ navigator داخل مسار الـ render الرئيسي. */
function NativeShareButton({
  referralCode,
  referralLink,
}: {
  referralCode: string;
  referralLink: string;
}) {
  if (typeof navigator === "undefined" || !("share" in navigator)) return null;
  return (
    <button
      onClick={() => {
        try {
          const nav = navigator as Navigator & {
            share?: (d: { title: string; text: string; url: string }) => Promise<void>;
          };
          nav.share?.({
            title: "دعوة لمنصة ثانوي",
            text: `انضم بكودي ${referralCode ?? ""}`,
            url: referralLink,
          })?.catch(() => {});
        } catch {
          /* تجاهل أخطاء المشاركة */
        }
      }}
      className="mt-3 text-xs font-black text-primary hover:underline relative"
    >
      مشاركة عبر النظام...
    </button>
  );
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await fetchReferralStatsRaw<ReferralStats>();
        setStats(normalizeReferralStats(data));
      } catch (err) {
        logger.error("Error: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const copyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast.success("تم نسخ الكود بنجاح");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${stats?.referralCode ?? ""}`
      : "";

  const q = query.trim().toLowerCase();
  const filteredHistory = (stats?.history ?? []).filter((r) =>
    !q ? true : `${r.referred?.name ?? ""} ${r.amount} ${r.id}`.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedHistory = filteredHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 dark:bg-white/10 rounded-full" />
          <div className="h-20 w-2/3 bg-gray-50 dark:bg-white/5 rounded-[2rem]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full">
          <BillingEmptyState
            icon={Gift}
            title="تعذر تحميل بيانات الإحالة"
            hint="تحقق من اتصالك ثم أعد المحاولة."
            action={
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all"
              >
                إعادة المحاولة
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
      <BillingPageHeader
        badge="برنامج الإحالة والمكافآت"
        BadgeIcon={Gift}
        title="ادعُ واكسب رصيداً"
        description="شارك كود الإحالة مع زملائك — عند اشتراك أي صديق بكودك تحصل على 20 ج.م في محفظتك فوراً."
        action={
          <Link
            href="/billing"
            className="flex items-center gap-2 text-primary font-black text-sm hover:underline"
          >
            <LayoutDashboard className="w-4 h-4" />
            العودة للمركز المالي
          </Link>
        }
      />

      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/15 rounded-full blur-[100px] group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 relative">
              <Share2 size={20} className="text-primary" />
              كود الإحالة الخاص بك
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 relative">
              <div className="flex-1 bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:border-primary/40 transition-all">
                <span className="text-2xl font-black text-white tracking-widest uppercase" dir="ltr">
                  {stats.referralCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                  title="نسخ الكود"
                  aria-label="نسخ كود الإحالة"
                >
                  {copied ? <CheckCircle2 size={20} className="text-emerald-400" /> : <Copy size={20} />}
                </button>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  toast.success("تم نسخ رابط الدعوة");
                }}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black transition-all shadow-[0_20px_50px_rgba(var(--primary-rgb),0.4)] active:scale-95 flex items-center justify-center gap-2"
              >
                نسخ رابط الدعوة
                <ArrowRight size={18} className="rotate-180" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 relative">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`انضم لمنصة ثانوي بكودي ${stats.referralCode}: ${referralLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500 hover:text-white transition-all"
              >
                مشاركة واتساب
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`انضم بكودي ${stats.referralCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-black hover:bg-sky-500 hover:text-white transition-all"
              >
                مشاركة تيليجرام
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black hover:bg-blue-500 hover:text-white transition-all"
              >
                مشاركة فيسبوك
              </a>
            </div>
            <NativeShareButton referralCode={stats.referralCode} referralLink={referralLink} />
          </div>

          <BillingStatCard
            icon={Wallet}
            iconWrap="bg-emerald-500/10 text-emerald-400"
            topLabel="إجمالي أرباحك"
            topLabelClass="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            value={<>{(stats.totalEarned ?? 0).toLocaleString()} <span className="text-sm text-gray-500 font-bold">ج.م</span></>}
            hint="مكافآت مكتسبة من الإحالات"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BillingStatCard
            icon={Users}
            iconWrap="bg-primary/15 text-primary"
            topLabel="أصدقاء انضموا"
            value={stats.referralCount ?? 0}
            hint="عبر كود الإحالة الخاص بك"
          />
          <BillingStatCard
            icon={TrendingUp}
            iconWrap="bg-amber-500/10 text-amber-400"
            topLabel="قيد الانتظار"
            value={stats.pendingRewards ?? 0}
            hint="مكافآت لم تُصرف بعد"
            delay={0.05}
          />
        </div>

        <div>
          <BillingSectionTitle
            icon={TrendingUp}
            title="سجل المكافآت"
            hint={`عرض ${pagedHistory.length} من أصل ${filteredHistory.length} مكافأة`}
          />
          <BillingFilterBar
            query={query}
            onQuery={(v) => { setQuery(v); setPage(1); }}
            searchPlaceholder="بحث باسم الصديق أو القيمة..."
            searchLabel="بحث في المكافآت"
            tabs={[{ value: "ALL", label: "الكل" }]}
            activeTab="ALL"
            onTab={() => {}}
            onExport={() => {
              if (filteredHistory.length === 0) { toast.info("لا توجد مكافآت لتصديرها"); return; }
              exportToCsv("referral-rewards", filteredHistory.map((r) => ({
                "الصديق": r.referred?.name || "طالب جديد",
                "القيمة (ج.م)": r.amount,
                "الحالة": "مكتمل",
                "التاريخ": new Date(r.createdAt).toLocaleDateString("ar-EG"),
              })));
              toast.success("تم تصدير المكافآت CSV");
            }}
            exportDisabled={filteredHistory.length === 0}
          />
          {filteredHistory.length === 0 ? (
            <BillingEmptyState
              icon={Gift}
              title={(stats?.history.length ?? 0) === 0 ? "لم تدعُ أي أصدقاء بعد" : "لا توجد نتائج مطابقة"}
              hint="انسخ كود الإحالة وشاركه — أول مكافأة بانتظارك."
            />
          ) : (
            <>
            <BillingTableShell headers={["الصديق", "القيمة", "الحالة", "التاريخ"]}>
              {pagedHistory.map((reward) => (
                <tr key={reward.id} className="hover:bg-primary/5 transition-colors border-l-2 border-transparent hover:border-primary/40">
                  <td className="text-start px-6 py-4 font-black text-gray-900 dark:text-white">{reward.referred?.name || "طالب جديد"}</td>
                  <td className="px-6 py-4 text-emerald-400 font-black text-center whitespace-nowrap">+{reward.amount} ج.م</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black">مكتمل</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-bold text-end whitespace-nowrap">
                    {new Date(reward.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </BillingTableShell>
            <BillingPagination page={safePage} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-primary/20 bg-primary/5 p-8 text-center"
        >
          <p className="text-gray-600 dark:text-gray-300 font-bold">
            كل صديق يشترك بكودك يمنحك <span className="text-emerald-400 font-black">20 ج.م</span> — بلا حد أقصى.
          </p>
        </m.div>
      </div>
    </div>
  );
}
