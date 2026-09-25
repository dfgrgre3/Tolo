'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION, RAIL } from '../design-system';
import { getCategoryIcon } from '../helpers';
import { fetchCategoriesRaw } from '@/features/courses/api/courses-gateway';

interface CategoryPath {
  id: string;
  name: string;
  slug: string;
  coursesCount: number;
  description?: string;
}

/**
 * Learning Path Card — built from real categories
 */
function LearningPathCard({ path }: { path: CategoryPath }) {
  const icon = getCategoryIcon(path.name);

  return (
    <Link href={`/courses?categoryId=${path.id}`} className={`${RAIL.item} w-80`}>
      <div className="group h-full flex flex-col bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden hover:shadow-lg dark:hover:shadow-orange-500/20 transition-all duration-150">

        {/* Header with Icon */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 dark:from-orange-500/20 to-emerald-100/50 dark:to-orange-600/20">
          <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-700 text-[#0F766E] dark:text-orange-500 flex items-center justify-center mb-3 text-xl">
            {icon}
          </div>
          <h3 className="text-base font-bold text-[#1E293B] dark:text-white mb-1.5 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
            {path.name}
          </h3>
          <p className="text-sm text-[#64748B] dark:text-slate-400 line-clamp-2">
            {path.description || `تعلم ${path.name} مع كورسات احترافية ومدرسين مؤهلين`}
          </p>
        </div>

        {/* Info Row */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          {/* Courses Count */}
          <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#E2E8F0] dark:border-slate-700">
            <span className="text-sm font-bold text-[#1E293B] dark:text-white">
              {path.coursesCount > 0 ? `${path.coursesCount} كورس` : 'كورسات متاحة'}
            </span>
            <span className="px-3.5 py-1.5 bg-[#0F766E] dark:bg-orange-600 text-white text-xs font-bold rounded-[8px] hover:bg-[#115E59] dark:hover:bg-orange-700 transition-colors">
              تصفح
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton for loading state */
function PathSkeleton() {
  return (
    <div className={`${RAIL.item} w-80`}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden animate-pulse">
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50">
          <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-700 mb-3" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
        <div className="p-4">
          <div className="h-8 w-full bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * LearningPathsSection
 *
 * Builds learning paths from real categories fetched from the backend.
 * Previously used hardcoded SAMPLE_PATHS data.
 */
export function LearningPathsSection() {
  const [paths, setPaths] = useState<CategoryPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCategoriesRaw<CategoryPath[]>('?limit=8')
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPaths(data.filter((c) => c.name));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && paths.length === 0) return null;

  return (
    <section className={SECTION.padding}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🎓 مسارات التعلم
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اختر مجالك وابدأ رحلة التعلم مع كورسات منظمة
            </p>
          </div>
          <Link
            href="/courses"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض جميع المجالات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Paths Rail */}
        <div className={RAIL.container}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <PathSkeleton key={i} />)
            : paths.map((path) => <LearningPathCard key={path.id} path={path} />)}
        </div>
      </div>
    </section>
  );
}
