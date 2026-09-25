'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Award } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION } from '../design-system';
import { getCategoryIcon } from '../helpers';
import { fetchCategoriesRaw } from '@/features/courses/api/courses-gateway';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  coursesCount?: number;
  description?: string;
}

const DEFAULT_GRADIENT = {
  color: 'from-blue-500 to-cyan-500',
  bg: 'from-blue-50 to-cyan-50 dark:from-blue-500/20 dark:to-cyan-500/20',
};

const GRADIENTS = [
  DEFAULT_GRADIENT,
  { color: 'from-purple-500 to-pink-500', bg: 'from-purple-50 to-pink-50 dark:from-purple-500/20 dark:to-pink-500/20' },
  { color: 'from-orange-500 to-red-500', bg: 'from-orange-50 to-red-50 dark:from-orange-500/20 dark:to-red-500/20' },
  { color: 'from-green-500 to-teal-500', bg: 'from-green-50 to-teal-50 dark:from-green-500/20 dark:to-teal-500/20' },
  { color: 'from-indigo-500 to-purple-500', bg: 'from-indigo-50 to-purple-50 dark:from-indigo-500/20 dark:to-purple-500/20' },
  { color: 'from-pink-500 to-rose-500', bg: 'from-pink-50 to-rose-50 dark:from-pink-500/20 dark:to-rose-500/20' },
];

/**
 * Specialization Card Component
 */
function SpecializationCard({ category, gradientIndex }: { category: CategoryData; gradientIndex: number }) {
  const gradient = GRADIENTS[gradientIndex % GRADIENTS.length] ?? DEFAULT_GRADIENT;
  const icon = getCategoryIcon(category.name);

  return (
    <Link href={`/courses?categoryId=${category.id}`}>
      <div className="group h-full flex flex-col bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden hover:shadow-xl dark:hover:shadow-orange-500/30 transition-all duration-150">

        {/* Header Gradient */}
        <div className={`bg-gradient-to-r ${gradient.color} p-4 text-white`}>
          <div className="flex items-start justify-between mb-2.5">
            <div className="text-2xl opacity-70">{icon}</div>
            <Award className="h-4 w-4 opacity-70" />
          </div>
          <h3 className="text-base font-bold mb-1.5">
            {category.name}
          </h3>
          <p className="text-sm opacity-90 line-clamp-2">
            {category.description || `كورسات متخصصة في مجال ${category.name}`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Stats Row */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E2E8F0] dark:border-slate-700">
            <div>
              <div className="text-xl font-black text-[#0F766E] dark:text-orange-500">
                {category.coursesCount ?? '—'}
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">كورس</p>
            </div>
            <div className="text-xs font-bold px-2 py-1 bg-[#F8FAFC] dark:bg-slate-700 text-[#0F766E] dark:text-orange-500 rounded-full">
              شهادة إتمام
            </div>
          </div>

          {/* CTA Button */}
          <span className="block text-center w-full px-4 py-2 bg-gradient-to-r from-[#0F766E] to-[#115E59] dark:from-orange-600 dark:to-orange-700 text-white font-bold text-sm rounded-[8px] mt-auto">
            تصفح الكورسات
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton for loading state */
function SpecializationSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden animate-pulse">
      <div className="p-4 bg-slate-200 dark:bg-slate-700 h-32" />
      <div className="p-4 space-y-3">
        <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-8 w-full bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

/**
 * SpecializationTracksSection
 *
 * Builds specialization tracks from real categories fetched from the backend.
 * Previously used hardcoded SPECIALIZATION_TRACKS data.
 */
export function SpecializationTracksSection() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCategoriesRaw<CategoryData[]>('?limit=6')
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setCategories(data.filter((c) => c.name));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className={`${SECTION.padding} bg-gradient-to-b from-white to-[#F8FAFC] dark:from-slate-900 dark:to-slate-950`}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
                تخصصات المنصة
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اختر تخصصك واحصل على شهادة إتمام عند الانتهاء
            </p>
          </div>
          <Link
            href="/courses"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض جميع التخصصات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Specialization Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SpecializationSkeleton key={i} />)
            : categories.map((cat, i) => (
                <SpecializationCard key={cat.id} category={cat} gradientIndex={i} />
              ))}
        </div>
      </div>
    </section>
  );
}
