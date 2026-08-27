'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Users, BookOpen, Clock } from 'lucide-react';
import { DashSection, DashEmpty } from '../shared/SectionShell';
import { DASH_RAIL } from '../shared/design-system';

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  courseCount?: number;
  enrolledCount?: number;
  duration?: string;
  icon?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  slug: string;
}

interface LearningPathsDashboardSectionProps {
  paths?: LearningPath[];
  loading?: boolean;
}

const LEVEL_LABELS = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم'
};

/** Module-level constants keep prop identities stable across parent renders. */
const EMPTY_PATHS: LearningPath[] = [];

/**
 * مسارات التعلم المنظمة — Noon rail of path cards inside the shared panel.
 */
function LearningPathsDashboardSectionBase({
  paths = EMPTY_PATHS,
  loading = false
}: LearningPathsDashboardSectionProps) {
  return (
    <DashSection
      title="مسارات التعلم المنظمة"
      subtitle="تعلم بطريقة منظمة مع خارطة طريق واضحة"
      href="/learning-paths"
      linkLabel="عرض جميع المسارات"
      rail
    >
      {loading ? (
        <div className={DASH_RAIL.container}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`${DASH_RAIL.item} w-80 h-64 bg-muted border border-border rounded-xl animate-pulse`}
            />
          ))}
        </div>
      ) : paths.length === 0 ? (
        <DashEmpty
          icon={MapPin}
          title="لا توجد مسارات تعلم متاحة حالياً"
        />
      ) : (
        <div className={DASH_RAIL.container}>
          {paths.map((path) => (
            <Link
              key={path.id}
              href={`/learning-paths/${path.slug}`}
              className={`${DASH_RAIL.item} group flex w-80 flex-col rounded-xl border border-border bg-card hover:border-primary transition-colors overflow-hidden`}
            >
              <div className="flex flex-1 flex-col gap-3 p-5">
                {/* Icon and Title */}
                <div className="flex items-start gap-3">
                  <div className="text-4xl shrink-0 transition-transform group-hover:scale-110" aria-hidden="true">
                    {path.icon || '🗺️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base text-foreground group-hover:text-primary-strong transition-colors line-clamp-1">
                      {path.title}
                    </h3>
                    {path.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {path.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Level Badge */}
                {path.level && (
                  <span className="w-fit inline-block px-2 py-0.5 bg-primary/10 text-primary-strong text-[11px] font-black rounded-md">
                    {LEVEL_LABELS[path.level]}
                  </span>
                )}

                {/* Stats */}
                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  {path.courseCount !== undefined && (
                    <div>
                      <div className="mb-0.5 flex items-center justify-center gap-1 text-primary-strong">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="text-xs font-black tabular-nums">{path.courseCount}</span>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">الكورسات</p>
                    </div>
                  )}

                  {path.enrolledCount !== undefined && (
                    <div>
                      <div className="mb-0.5 flex items-center justify-center gap-1 text-primary-strong">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="text-xs font-black tabular-nums">
                          {(path.enrolledCount / 1000).toFixed(1)}K
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">الملتحقين</p>
                    </div>
                  )}

                  {path.duration && (
                    <div>
                      <div className="mb-0.5 flex items-center justify-center gap-1 text-primary-strong">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="text-xs font-black">{path.duration}</span>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">المدة</p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button className="w-full py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:opacity-90 transition-opacity">
                  ابدأ المسار
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashSection>
  );
}

export const LearningPathsDashboardSection = React.memo(LearningPathsDashboardSectionBase);
