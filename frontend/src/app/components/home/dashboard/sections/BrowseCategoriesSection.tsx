'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { getCategoryIcon } from '../../guest/helpers';
import { DashSection, DashEmpty } from '../shared/SectionShell';
import { DASH_RAIL } from '../shared/design-system';

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

/** Module-level constants keep prop identities stable across parent renders. */
const EMPTY_CATEGORIES: Category[] = [];

/**
 * تصفح الكورسات حسب المجال — Noon rail of circular category tiles
 * inside the shared flat panel.
 */
function BrowseCategoriesSectionBase({
  categories = EMPTY_CATEGORIES,
  loading = false
}: BrowseCategoriesSectionProps) {
  return (
    <DashSection
      title="تصفح حسب المجال"
      subtitle="اختر المجال الذي تريد احترافه"
      href="/courses"
      rail
    >
      {loading ? (
        <div className={DASH_RAIL.container}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`${DASH_RAIL.item} h-28 w-28 bg-muted border border-border rounded-xl animate-pulse`}
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <DashEmpty icon={BookOpen} title="لا توجد تصنيفات متاحة حالياً" />
      ) : (
        <div className={DASH_RAIL.container}>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/courses?categoryId=${cat.id}`}
              className={`${DASH_RAIL.item} flex flex-col items-center justify-center w-28 p-3.5 bg-card border border-border rounded-xl hover:border-primary text-center group transition-colors duration-150`}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary-strong flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground text-xl transition-colors">
                {getCategoryIcon(cat.name)}
              </div>
              <h3 className="text-xs font-bold text-foreground group-hover:text-primary-strong line-clamp-1 transition-colors">
                {cat.name}
              </h3>
              {cat.coursesCount !== undefined && (
                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                  {cat.coursesCount} كورس
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </DashSection>
  );
}

export const BrowseCategoriesSection = React.memo(BrowseCategoriesSectionBase);
