'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Flame } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION, RAIL } from '../design-system';
import { getCategoryIcon } from '../helpers';
import { fetchCategoriesRaw } from '@/features/courses/api/courses-gateway';

interface CategoryTrend {
  id: string;
  name: string;
  slug: string;
  coursesCount?: number;
}

/**
 * Trending Topic Card — built from real categories
 */
function TrendingTopicCard({ topic }: { topic: CategoryTrend }) {
  const icon = getCategoryIcon(topic.name);

  return (
    <Link href={`/courses?categoryId=${topic.id}`} className={`${RAIL.item} w-44`}>
      <div className="group h-full p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] hover:border-[#0F766E] dark:hover:border-orange-500 hover:shadow-md dark:hover:shadow-orange-500/20 transition-all duration-150 cursor-pointer">

        {/* Top Row: Icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-orange-500/20 rounded-full">
            <Flame className="h-3 w-3 text-[#0F766E] dark:text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1E293B] dark:text-white mb-2 line-clamp-1 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
          {topic.name}
        </h3>

        {/* Divider */}
        <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-3 pt-3" />

        {/* Courses Count */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F766E] dark:text-orange-500">
            {topic.coursesCount !== undefined && topic.coursesCount > 0
              ? `${topic.coursesCount} كورس`
              : 'كورسات متاحة'}
          </span>
          <span className="text-xs text-[#64748B] dark:text-slate-400">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton for loading state */
function TopicSkeleton() {
  return (
    <div className={`${RAIL.item} w-44`}>
      <div className="h-full p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] animate-pulse">
        <div className="flex justify-between mb-3">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-5 w-8 bg-slate-100 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
        <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-3 pt-3" />
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

/**
 * TrendingTopicsSection
 *
 * Displays real categories as trending topics.
 * Previously used hardcoded TRENDING_TOPICS with fake numbers.
 */
export function TrendingTopicsSection() {
  const [topics, setTopics] = useState<CategoryTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCategoriesRaw<CategoryTrend[]>('?limit=8')
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setTopics(data.filter((c) => c.name));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && topics.length === 0) return null;

  return (
    <section className={SECTION.padding}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className="h-4 w-4 text-[#0F766E] dark:text-orange-500" />
              <span className="text-xs font-bold bg-emerald-50 dark:bg-orange-500/20 text-[#0F766E] dark:text-orange-400 px-2.5 py-0.5 rounded-full">
                استكشف المجالات
              </span>
            </div>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              مجالات التعلم المتاحة
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اكتشف المجالات المتاحة على المنصة
            </p>
          </div>
          <Link
            href="/courses"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Topics Rail */}
        <div className={RAIL.container}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <TopicSkeleton key={i} />)
            : topics.map((topic) => (
                <TrendingTopicCard key={topic.id} topic={topic} />
              ))}
        </div>
      </div>
    </section>
  );
}
