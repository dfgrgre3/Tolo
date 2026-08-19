import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { getCategoryIcon } from '../helpers';
import type { Category } from '../types';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">
            تصفح الكورسات حسب المجال
          </h2>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            اختر المجال الذي تريد احترافه وابدأ رحلة التعلم
          </p>
        </div>
        <Link
          href="/courses"
          className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59]"
        >
          عرض الكل <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white border border-[#E2E8F0] rounded-[12px]"
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#64748B]">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
          لا توجد تصنيفات متاحة حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/courses?categoryId=${cat.id}`}
              className="flex flex-col items-center justify-center p-5 bg-white border border-[#E2E8F0] rounded-[12px] hover:border-[#0F766E] hover:shadow-md text-center group"
            >
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center mb-3 group-hover:bg-[#0F766E] group-hover:text-white text-2xl">
                {getCategoryIcon(cat.name)}
              </div>
              <h3 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-1">
                {cat.name}
              </h3>
              {cat.coursesCount !== undefined && (
                <span className="text-xs text-[#64748B] mt-1 font-medium">
                  {cat.coursesCount} كورس
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
