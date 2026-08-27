import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { getCategoryIcon } from '../helpers';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, RAIL } from '../design-system';
import type { Category } from '../types';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  return (
    <section className="py-10">
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              تصفح الكورسات حسب المجال
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اختر المجال الذي تريد احترافه وابدأ رحلة التعلم
            </p>
          </div>
          <Link href="/courses" className={SECTION_HEADER.viewAllButton}>
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className={RAIL.container}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`${RAIL.item} h-28 w-32 bg-white border border-[#E2E8F0] rounded-[12px] animate-pulse`}
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#64748B]">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            لا توجد تصنيفات متاحة حالياً.
          </div>
        ) : (
          <div className={RAIL.container}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?categoryId=${cat.id}`}
                className={`${RAIL.item} flex flex-col items-center justify-center w-32 p-4 bg-white border border-[#E2E8F0] rounded-[12px] hover:border-[#0F766E] hover:shadow-md text-center group transition-all duration-150`}
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center mb-2.5 group-hover:bg-[#0F766E] group-hover:text-white text-xl transition-colors duration-150">
                  {getCategoryIcon(cat.name)}
                </div>
                <h3 className="text-xs font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-1">
                  {cat.name}
                </h3>
                {cat.coursesCount !== undefined && (
                  <span className="text-[10px] text-[#64748B] mt-1 font-medium">
                    {cat.coursesCount} كورس
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
