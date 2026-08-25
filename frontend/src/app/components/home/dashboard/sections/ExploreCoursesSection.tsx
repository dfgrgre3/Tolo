'use client';

import Link from 'next/link';
import { ChevronLeft, Flame, Clock, Star } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';

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

/**
 * استكشف الكورسات المتاحة
 * نسخة من صفحة الزائرين مخصصة للمستخدمين المسجلين
 */
export function ExploreCoursesSection({
  courses = [],
  loading = false,
  selectedTab = 'popular',
  onTabChange = () => {}
}: ExploreCoursesSectionProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              استكشف الكورسات
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              كورسات مصممة لتناسب كل المستويات
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors w-fit"
          >
            عرض جميع الكورسات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="ترتيب الكورسات"
          className="flex items-center bg-muted border border-input p-1 rounded-lg w-fit"
          aria-orientation="horizontal"
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedTab === key}
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                selectedTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-input">
            <p className="text-sm text-muted-foreground font-bold">
              لا توجد كورسات متاحة حالياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
