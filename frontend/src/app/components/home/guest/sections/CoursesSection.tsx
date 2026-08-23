import Link from 'next/link';
import { BookOpen, Flame, Clock, Star } from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { normalizeCourse } from '../helpers';
import type { CourseSort } from '../api';
import type { CourseItem } from '../types';

const TABS = [
  { key: 'popular', label: 'الأكثر شعبية', icon: Flame },
  { key: 'latest', label: 'الأحدث', icon: Clock },
  { key: 'top_rated', label: 'الأعلى تقييماً', icon: Star },
] as const;

interface CoursesSectionProps {
  courses: CourseItem[];
  loading: boolean;
  selectedTab: CourseSort;
  onTabChange: (tab: CourseSort) => void;
}

export function CoursesSection({
  courses,
  loading,
  selectedTab,
  onTabChange,
}: CoursesSectionProps) {
  return (
    <section className="py-16 bg-white border-y border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">
              استكشف الكورسات المتاحة
            </h2>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              كورسات مصممة لتناسب كل المستويات
            </p>
          </div>

          <div
            role="tablist"
            aria-label="ترتيب الكورسات - اختر طريقة العرض"
            className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-[8px] self-start"
            aria-orientation="horizontal"
          >
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selectedTab === key}
                aria-controls={`courses-panel-${key}`}
                onClick={() => onTabChange(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[6px] transition-all focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 ${
                  selectedTab === key
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white/50'
                }`}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
            <BookOpen className="h-12 w-12 text-[#64748B] mx-auto mb-4 opacity-50" />
            <p className="text-sm text-[#64748B] font-bold">
              لا توجد كورسات متاحة حالياً في هذا القسم.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((c) => {
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

        <div className="text-center mt-10">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] hover:text-[#0F766E] text-[#1E293B] font-bold text-sm rounded-[8px]"
          >
            <BookOpen className="h-4 w-4" />
            عرض كافة الكورسات
          </Link>
        </div>
      </div>
    </section>
  );
}
