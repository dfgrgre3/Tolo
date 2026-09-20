'use client';

import Link from 'next/link';
import { Heart, ChevronLeft, Gift } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { normalizeCourse } from '../helpers';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION, RAIL } from '../design-system';
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
    <section className={`${SECTION.padding} bg-gradient-to-b from-[#FEF3C7] to-[#FEF08A] dark:from-orange-500/10 dark:to-orange-600/10`}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <div className="flex items-center gap-2 mb-1.5">
              <Gift className="h-4 w-4 text-[#F59E0B]" />
              <span className="text-xs font-bold bg-white dark:bg-slate-800 text-[#F59E0B] px-2.5 py-0.5 rounded-full">
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
          <div className={RAIL.container}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${RAIL.item} w-72`}>
                <CourseCardSkeleton />
              </div>
            ))}
          </div>
        ) : freeCourses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-[12px] border border-[#E2E8F0] dark:border-slate-700">
            <Heart className="h-12 w-12 text-[#F59E0B] mx-auto mb-4 opacity-50" />
            <p className="text-sm text-[#64748B] dark:text-slate-400 font-bold">
              لا توجد كورسات مجانية متاحة حالياً
            </p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-2">
              تحقق لاحقاً للحصول على كورسات مجانية جديدة
            </p>
          </div>
        ) : (
          <div className={RAIL.container}>
            {freeCourses.map((c) => {
              const norm = normalizeCourse(c);
              return (
                <div key={norm.id} className={`${RAIL.item} w-72`}>
                  <CourseCard
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
