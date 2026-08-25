'use client';

import Link from 'next/link';
import { Heart, ChevronLeft, Gift } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { normalizeCourse } from '../helpers';
import { GRIDS, CONTAINER, TYPOGRAPHY, SECTION_HEADER } from '../design-system';
import type { CourseItem } from '../types';

interface FreeResourcesSectionProps {
  courses: CourseItem[];
  loading: boolean;
}

/**
 * FreeResourcesSection
 *
 * Displays free courses and resources to help beginners get started
 */
export function FreeResourcesSection({ courses, loading }: FreeResourcesSectionProps) {
  const freeCourses = courses.filter((c) => (c.price ?? 0) === 0).slice(0, 4);

  if (!freeCourses.length && !loading) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-[#FEF3C7] to-[#FEF08A] dark:from-orange-500/10 dark:to-orange-600/10 border-b border-[#F59E0B] dark:border-orange-500/30">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-[#F59E0B]" />
              <span className="text-xs font-bold bg-white dark:bg-slate-800 text-[#F59E0B] px-3 py-1 rounded-full">
                مجاني تماماً
              </span>
            </div>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              ابدأ التعلم مجاناً
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              موارد تعليمية مجانية لمساعدتك على بدء رحلة التعلم
            </p>
          </div>
          <Link
            href="/courses?price=free"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض جميع الموارد المجانية <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className={GRIDS.courses}>
            {Array.from({ length: 4 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : freeCourses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-[12px] border border-[#E2E8F0] dark:border-slate-700">
            <Heart className="h-12 w-12 text-[#F59E0B] mx-auto mb-4 opacity-50" />
            <p className="text-sm text-[#64748B] dark:text-slate-400 font-bold">
              لا توجد كورسات مجانية متاحة حالياً
            </p>
            <p className="text-xs text-[#94A3B8] dark:text-slate-500 mt-2">
              تحقق لاحقاً للحصول على كورسات مجانية جديدة
            </p>
          </div>
        ) : (
          <div className={GRIDS.courses}>
            {freeCourses.map((c) => {
              const norm = normalizeCourse(c);
              return (
                <CourseCard
                  key={norm.id}
                  id={norm.id}
                  title={norm.title}
                  slug={norm.slug}
                  thumbnail={norm.thumbnail}
                  categoryName={norm.categoryName}
                  instructorName={norm.instructorName}
                  ratingAvg={norm.ratingAvg}
                  reviewsCount={norm.reviewsCount}
                  studentsCount={norm.studentsCount}
                  price={norm.price}
                  discountPrice={norm.discountPrice}
                  level={norm.level}
                />
              );
            })}
          </div>
        )}

        {/* Benefits Row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-white dark:bg-slate-800 rounded-[12px] border border-[#E2E8F0] dark:border-slate-700">
          <div className="text-center">
            <div className="text-2xl mb-2">🎓</div>
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">شهادات معتمدة</p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">احصل على شهادة عند الإنهاء</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">محتوى عملي</p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">مشاريع وتطبيقات حقيقية</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⏰</div>
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">تعلم بوقتك</p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">بدون التزامات زمنية</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#1E293B] dark:text-white mb-4">
            هل تريد المزيد من الموارد المجانية؟
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/blog"
              className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
            >
              📝 المدونة التعليمية
            </Link>
            <Link
              href="/tutorials"
              className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
            >
              🎥 الفيديوهات التعليمية
            </Link>
            <Link
              href="/resources"
              className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
            >
              📚 قاعدة الموارد
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
