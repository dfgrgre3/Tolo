'use client';

import { TrendingUp, Users, BookOpen, Award } from 'lucide-react';
import { CONTAINER, GRIDS, SHADOWS } from '../design-system';
import type { PlatformStats } from '../types';

interface PlatformStatsSectionProps {
  stats: PlatformStats | null;
  loading?: boolean;
}

/**
 * Stat Card Component
 */
function StatCard({ icon: Icon, label, value, gradient }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className={`
      p-4 bg-white dark:bg-slate-800
      border border-[#E2E8F0] dark:border-slate-700
      rounded-[12px]
      ${SHADOWS.hover}
      transition-all duration-150
    `}>
      <div className={`
        h-11 w-11 rounded-xl
        ${gradient}
        flex items-center justify-center mb-3
      `}>
        {Icon}
      </div>
      <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium mb-1">
        {label}
      </p>
      <p className="text-2xl font-black text-[#1E293B] dark:text-white">
        {value}
      </p>
    </div>
  );
}

/**
 * PlatformStatsSection displays aggregate platform statistics
 *
 * Shows:
 * - Total courses
 * - Total students
 * - Total instructors
 * - Total enrollments
 *
 * Only displays if stats are available
 */
export function PlatformStatsSection({ stats }: PlatformStatsSectionProps) {
  if (!stats) {
    return null;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('ar-EG');
  };

  return (
    <section className="py-10 bg-gradient-to-r from-[#0F766E]/5 to-[#F59E0B]/5 dark:from-orange-500/5 dark:to-orange-500/10 border-y border-[#E2E8F0] dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-[#0F766E] dark:text-orange-500" />
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] dark:text-white">
              أرقام المنصة
            </h2>
          </div>
          <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">
            ملايين المتعلمين يثقون بمنصة ثنائي
          </p>
        </div>

        {/* Stats Grid */}
        <div className={GRIDS.stats}>
          <StatCard
            icon={<BookOpen className="h-6 w-6 text-[#0F766E] dark:text-orange-500" />}
            label="كورس متاح"
            value={formatNumber(stats.courses)}
            gradient="bg-emerald-50 dark:bg-orange-500/20"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            label="متعلم نشط"
            value={formatNumber(stats.students)}
            gradient="bg-blue-50 dark:bg-blue-500/20"
          />
          <StatCard
            icon={<Award className="h-6 w-6 text-[#F59E0B] dark:text-amber-400" />}
            label="مدرس معتمد"
            value={formatNumber(stats.instructors)}
            gradient="bg-amber-50 dark:bg-amber-500/20"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
            label="تسجيل نشط"
            value={formatNumber(stats.enrollments)}
            gradient="bg-purple-50 dark:bg-purple-500/20"
          />
        </div>
      </div>
    </section>
  );
}
