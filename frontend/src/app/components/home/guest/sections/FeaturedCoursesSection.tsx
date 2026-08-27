'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { normalizeCourse } from '../helpers';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, RAIL } from '../design-system';
import type { CourseItem } from '../types';

interface FeaturedCoursesSectionProps {
  courses: CourseItem[];
  loading: boolean;
}

/**
 * FeaturedCoursesSection displays hand-picked premium courses
 * positioned as the top choices for learners
 *
 * Features:
 * - Grid layout (4 columns on desktop)
 * - Loading skeleton states
 * - Empty state handling
 * - Consistent card styling
 */
export function FeaturedCoursesSection({ courses, loading }: FeaturedCoursesSectionProps) {
  if (!courses.length && !loading) {
    return null; // Don't show section if no featured courses
  }

  return (
    <section className="py-10 bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#E2E8F0] dark:from-slate-950 dark:to-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🌟 الكورسات المميزة
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              أختيرت بعناية لتقديم أفضل قيمة تعليمية
            </p>
          </div>
          <Link
            href="/courses?featured=true"
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
