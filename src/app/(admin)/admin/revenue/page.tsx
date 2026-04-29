"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { useQuery } from "@tanstack/react-query";
import { m } from "framer-motion";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw,
  Package,
  Banknote,
  PieChart,
  BarChart3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface RevenueStats {
  summary: {
    today: number;
    thisMonth: number;
    totalTransactions: number;
    conversionRate: string;
  };
  chartData: { name: string; revenue: number }[];
  topPlans: { name: string; count: number }[];
}

type PeriodFilter = "week" | "month" | "quarter" | "year";

const periodLabels: Record<PeriodFilter, string> = {
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  quarter: "هذا الربع",
  year: "هذا العام",
};

export default function AdminRevenuePage() {
  const [period, setPeriod] = React.useState<PeriodFilter>("month");

  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "revenue", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/revenue?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return (await res.json()) as RevenueStats;
    },
  });

  const handleExport = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${period}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير المالي بنجاح");
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20" dir="rtl">
        <div className="h-24 animate-pulse rounded-[2rem] bg-white/5 border border-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-[2rem] bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="h-[400px] animate-pulse rounded-[2rem] bg-white/5 border border-white/10" />
      </div>
    );
  }

  const safeStats = stats || {
    summary: { today: 0, thisMonth: 0, totalTransactions: 0, conversionRate: "0%" },
    chartData: [],
    topPlans: [],
  };

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="التحليل المالي والإيرادات 💰"
        description="متابعة الأرباح، المعاملات المالية، ومعدلات التحويل للمنصة بشكل مباشر ومفصل."
      >
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-40 h-11 rounded-2xl bg-background border-border text-foreground font-black hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover/90 backdrop-blur-xl border-border text-popover-foreground font-black rounded-2xl">
              {Object.entries(periodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="focus:bg-primary/20">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AdminButton variant="outline" icon={Download} onClick={handleExport}>
            تصدير التقرير
          </AdminButton>
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()} loading={isFetching}>
            تحديث
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <AdminStatsCard
            title="أرباح اليوم"
            value={safeStats.summary.today}
            icon={DollarSign}
            color="blue"
            description="ج.م تم تحصيلها اليوم"
          />
        </m.div>
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AdminStatsCard
            title="أرباح الشهر"
            value={safeStats.summary.thisMonth}
            icon={TrendingUp}
            color="green"
            description="ج.م إجمالي الشهر الحالي"
          />
        </m.div>
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AdminStatsCard
            title="إجمالي المعاملات"
            value={safeStats.summary.totalTransactions}
            icon={CreditCard}
            color="purple"
            description="عملية دفع تمت بنجاح"
          />
        </m.div>
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="rpg-glass-light dark:rpg-glass p-6 rounded-[2rem] border border-white/10 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black ${
                parseFloat(safeStats.summary.conversionRate) > 5 ? "text-emerald-500" : "text-amber-500"
              }`}>
                {parseFloat(safeStats.summary.conversionRate) > 5 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {safeStats.summary.conversionRate}
              </div>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
              معدل التحويل (CR)
            </p>
            <p className="text-3xl font-black">{safeStats.summary.conversionRate}</p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">نسبة تحول الزوار لمشترين</p>
          </div>
        </m.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rpg-glass-light dark:rpg-glass p-8 rounded-[2rem] border border-white/10"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span>تحليل الإيرادات</span>
            </h3>
          </div>
          <div className="h-[350px] w-full">
            {safeStats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeStats.chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <PieChart className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-bold">لا توجد بيانات للفترة المحددة</p>
              </div>
            )}
          </div>
        </m.div>

        {/* Top Plans */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rpg-glass-light dark:rpg-glass p-8 rounded-[2rem] border border-white/10"
        >
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <Package className="w-5 h-5 text-purple-500" />
            <span>الباقات الأكثر مبيعاً</span>
          </h3>
          <div className="space-y-6">
            {safeStats.topPlans.map((plan, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-muted-foreground group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-all border border-white/5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-black text-sm group-hover:text-purple-400 transition-all">
                      {plan.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      {plan.count} اشتراك
                    </div>
                  </div>
                </div>
                <div className="text-sm font-black text-muted-foreground">
                  {safeStats.summary.totalTransactions > 0
                    ? Math.round((plan.count / safeStats.summary.totalTransactions) * 100)
                    : 0}
                  %
                </div>
              </div>
            ))}
            {safeStats.topPlans.length === 0 && (
              <div className="text-center py-12">
                <Banknote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-bold text-sm">لا توجد اشتراكات مسجلة بعد</p>
              </div>
            )}
          </div>
        </m.div>
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rpg-glass-light dark:rpg-glass p-8 rounded-[2rem] border border-white/10 flex items-center justify-between"
        >
          <div>
            <h4 className="text-lg font-black mb-2">أداء صفحة الدفع (Checkout)</h4>
            <p className="text-sm text-muted-foreground font-bold">
              معدل التحويل الحالي هو {safeStats.summary.conversionRate}
            </p>
          </div>
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl border border-primary/20">
            {safeStats.summary.conversionRate}
          </div>
        </m.div>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rpg-glass-light dark:rpg-glass p-8 rounded-[2rem] border border-white/10 flex items-center justify-between"
        >
          <div>
            <h4 className="text-lg font-black mb-2">إجمالي الاشتراكات المفعلة</h4>
            <p className="text-sm text-muted-foreground font-bold">
              تتم معالجة كافة العمليات عبر بوابات دفع آمنة
            </p>
          </div>
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 font-black text-xl border border-purple-500/20">
            {safeStats.summary.totalTransactions}
          </div>
        </m.div>
      </div>
    </div>
  );
}
