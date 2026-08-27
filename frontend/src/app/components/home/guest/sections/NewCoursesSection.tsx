'use client';

import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { normalizeCourse } from '../helpers';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, RAIL } from '../design-system';
import type { CourseItem } from '../types';

interface NewCoursesSectionProps {
  courses: CourseItem[];
  loading: boolean;
}

/**
 * NewCoursesSection displays the latest courses added to the platform
 *
 * Features:
 * - Recently added indicator
 * - Grid layout (4 columns on desktop)
 * - Loading states
 * - Empty state handling
 */
export function NewCoursesSection({ courses, loading }: NewCoursesSectionProps) {
  if (!courses.length && !loading) {
    return null;
  }

  return (
    <section className="py-10 bg-white border-b border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-[#F59E0B] dark:text-orange-500" />
              <span className="inline-block px-2.5 py-0.5 bg-[#FEF3C7] text-[#D97706] text-xs font-bold rounded-full dark:bg-orange-500/20 dark:text-orange-400">
                جديد الآن
              </span>
            </div>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              أحدث الكورسات
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اكتشف المحتوى الذي تمت إضافته مؤخراً
            </p>
          </div>
          <Link
            href="/courses?sort=latest"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
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
        ) : (
          <div className={RAIL.container}>
            {courses.map((c) => {
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
