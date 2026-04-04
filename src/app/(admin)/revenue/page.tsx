"use client";

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Calendar,
  Activity,
} from 'lucide-react';

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

export default function AdminRevenueDashboard() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/analytics/revenue');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Activity className="text-blue-500" />
              لوحة التحليل المالي والنمو
            </h1>
            <p className="text-gray-500 font-medium">متابعة الأرباح والتحويلات المالية للمنصة بشكل مباشر</p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-300">اليوم: {new Date().toLocaleDateString('ar-EG', { dateStyle: 'long' })}</span>
          </div>
        </header>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="أرباح اليوم" 
            value={`${stats.summary.today.toLocaleString()} ج.م`} 
            icon={<DollarSign size={24} />} 
            trend="+12%" 
            trendUp={true}
            color="blue"
          />
          <StatCard 
            title="أرباح الشهر الحالي" 
            value={`${stats.summary.thisMonth.toLocaleString()} ج.م`} 
            icon={<TrendingUp size={24} />} 
            trend="+5%" 
            trendUp={true}
            color="green"
          />
          <StatCard 
            title="إجمالي العمليات" 
            value={stats.summary.totalTransactions.toLocaleString()} 
            icon={<CreditCard size={24} />} 
            trend="+8%" 
            trendUp={true}
            color="purple"
          />
          <StatCard 
            title="معدل التحويل (CR)" 
            value={stats.summary.conversionRate} 
            icon={<Users size={24} />} 
            trend="-2%" 
            trendUp={false}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-[#111114] border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" />
                تحليل الأرباح (آخر 6 أشهر)
              </h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111114', borderColor: '#ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Plans Card */}
          <div className="bg-[#111114] border border-white/5 rounded-[2.5rem] p-8">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Package size={20} className="text-purple-500" />
              الباقات الأكثر مبيعاً
            </h3>
            <div className="space-y-6">
              {stats.topPlans.map((plan, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gray-400 group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-all">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-purple-400 transition-all">{plan.name}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest">{plan.count} اشتراك</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-white/50">{Math.round((plan.count / stats.summary.totalTransactions) * 100)}%</div>
                </div>
              ))}
              {stats.topPlans.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-medium">لا توجد اشتراكات مسجلة بعد.</div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 rounded-[2REM] p-8 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold mb-2">أداء صفحة الدفع (Checkout)</h4>
              <p className="text-sm text-gray-400">معدل التحويل الحالي هو {stats.summary.conversionRate}.</p>
            </div>
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl">
              {stats.summary.conversionRate}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-600/10 to-transparent border border-white/5 rounded-[2REM] p-8 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold mb-2">إجمالي الاشتراكات المفعلة</h4>
              <p className="text-sm text-gray-400">تتم معالجة كافة العمليات عبر بوابات دفع آمنة.</p>
            </div>
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500 font-black text-xl">
              {stats.summary.totalTransactions}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, trend, trendUp, color }: StatCardProps) {
  const colorMap: Record<StatCardProps['color'], string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  };

  return (
    <div className="bg-[#111114] border border-white/5 p-6 rounded-[2rem] group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trend}
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </div>
      </div>
      <div className="text-gray-500 text-sm font-bold mb-1 uppercase tracking-widest">{title}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
