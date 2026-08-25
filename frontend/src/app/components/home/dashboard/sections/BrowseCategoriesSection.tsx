'use client';

import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { getCategoryIcon } from '../../guest/helpers';

interface Category {
  id: string;
  name: string;
  coursesCount?: number;
  slug: string;
}

interface BrowseCategoriesSectionProps {
  categories?: Category[];
  loading?: boolean;
}

/**
 * تصفح الكورسات حسب المجال
 * نسخة من صفحة الزائرين مخصصة للمستخدمين المسجلين
 */
export function BrowseCategoriesSection({
  categories = [],
  loading = false
}: BrowseCategoriesSectionProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              تصفح حسب المجال
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              اختر المجال الذي تريد احترافه
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-muted border border-input rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            لا توجد تصنيفات متاحة حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?categoryId=${cat.id}`}
                className="flex flex-col items-center justify-center p-5 bg-card border border-input rounded-lg hover:border-primary/50 hover:shadow-md text-center group transition-all duration-150"
              >
                <div className="h-12 w-12 rounded-xl bg-muted text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground text-2xl transition-all">
                  {getCategoryIcon(cat.name)}
                </div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary line-clamp-1 transition-colors">
                  {cat.name}
                </h3>
                {cat.coursesCount !== undefined && (
                  <span className="text-xs text-muted-foreground mt-1 font-medium">
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
