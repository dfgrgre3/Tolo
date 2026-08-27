'use client';

import React from 'react';
import { Flame, Clock, Star } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { DashSection, DashEmpty } from '../shared/SectionShell';
import { DASH_RAIL, DASH_TABS } from '../shared/design-system';

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  instructorName?: string;
  categoryName?: string;
  ratingAvg?: number | null;
  reviewsCount?: number;
  studentsCount?: number;
  level?: string;
  discountPrice?: number;
}

interface ExploreCoursesSectionProps {
  courses?: Course[];
  loading?: boolean;
  selectedTab?: 'popular' | 'latest' | 'top_rated';
  onTabChange?: (tab: 'popular' | 'latest' | 'top_rated') => void;
}

const TABS = [
  { key: 'popular' as const, label: 'الأكثر شعبية', icon: Flame },
  { key: 'latest' as const, label: 'الأحدث', icon: Clock },
  { key: 'top_rated' as const, label: 'الأعلى تقييماً', icon: Star },
];

/** Module-level constants keep prop identities stable across parent renders. */
const EMPTY_COURSES: Course[] = [];
const NOOP = () => {};

/**
 * استكشف الكورسات — tabbed Noon rail of course cards inside the shared panel.
 */
function ExploreCoursesSectionBase({
  courses = EMPTY_COURSES,
  loading = false,
  selectedTab = 'popular',
  onTabChange = NOOP
}: ExploreCoursesSectionProps) {
  return (
    <DashSection
      title="استكشف الكورسات"
      subtitle="كورسات مصممة لتناسب كل المستويات"
      href="/courses"
      linkLabel="عرض جميع الكورسات"
      rail
      toolbar={
        <div role="tablist" aria-label="ترتيب الكورسات" aria-orientation="horizontal" className={DASH_TABS.list}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedTab === key}
              onClick={() => onTabChange(key)}
              className={`${DASH_TABS.tab} flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                selectedTab === key ? DASH_TABS.tabActive : DASH_TABS.tabIdle
              }`}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className={DASH_RAIL.container}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${DASH_RAIL.item} w-72`}>
              <CourseCardSkeleton />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <DashEmpty
          icon={Star}
          title="لا توجد كورسات متاحة حالياً"
          description="تابعنا قريباً — تُضاف كورسات جديدة باستمرار"
        />
      ) : (
        <div className={DASH_RAIL.container}>
          {courses.map((course) => (
            <div key={course.id} className={`${DASH_RAIL.item} w-72`}>
              <CourseCard
                id={course.id}
                title={course.title}
                slug={course.slug}
                thumbnail={course.thumbnail}
                categoryName={course.categoryName}
                instructorName={course.instructorName}
                ratingAvg={course.ratingAvg}
                reviewsCount={course.reviewsCount}
                studentsCount={course.studentsCount}
                price={course.price}
                discountPrice={course.discountPrice}
                level={course.level}
              />
            </div>
          ))}
        </div>
      )}
    </DashSection>
  );
}

export const ExploreCoursesSection = React.memo(ExploreCoursesSectionBase);
