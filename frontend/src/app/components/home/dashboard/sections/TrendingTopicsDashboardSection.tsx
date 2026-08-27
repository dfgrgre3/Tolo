'use client';

import React from 'react';
import { TrendingUp, Flame } from 'lucide-react';
import { DashSection, DashEmpty } from '../shared/SectionShell';
import { DASH_RAIL, DASH_BADGE } from '../shared/design-system';

interface Topic {
  id: string;
  name: string;
  courseCount?: number;
  studentCount?: number;
  trendPercentage?: number;
  category?: string;
}

interface TrendingTopicsDashboardSectionProps {
  topics?: Topic[];
  loading?: boolean;
}

/** Module-level constants keep prop identities stable across parent renders. */
const EMPTY_TOPICS: Topic[] = [];

/**
 * المواضيع الشائعة الآن — Noon rail of compact stat cards.
 */
function TrendingTopicsDashboardSectionBase({
  topics = EMPTY_TOPICS,
  loading = false
}: TrendingTopicsDashboardSectionProps) {
  return (
    <DashSection
      title="المواضيع الشائعة الآن"
      subtitle="اكتشف أكثر المواضيع طلباً في هذه اللحظة"
      rail
    >
      {loading ? (
        <div className={DASH_RAIL.container}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`${DASH_RAIL.item} w-64 h-32 bg-muted border border-border rounded-xl animate-pulse`}
            />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <DashEmpty icon={TrendingUp} title="لا توجد مواضيع شائعة متاحة حالياً" />
      ) : (
        <div className={DASH_RAIL.container}>
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`${DASH_RAIL.item} w-64 p-4 bg-muted/40 border border-border rounded-xl hover:border-primary transition-colors group cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary-strong transition-colors line-clamp-1">
                    {topic.name}
                  </h3>
                  {topic.category && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium line-clamp-1">
                      {topic.category}
                    </p>
                  )}
                </div>
                <span className={DASH_BADGE.hot}>
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  الآن
                </span>
              </div>

              <div className="space-y-1.5">
                {topic.studentCount !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">الطلاب المهتمين</span>
                    <span className="text-foreground font-bold tabular-nums">
                      {topic.studentCount.toLocaleString('ar-SA')}
                    </span>
                  </div>
                )}

                {topic.courseCount !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">عدد الكورسات</span>
                    <span className="text-foreground font-bold tabular-nums">{topic.courseCount}</span>
                  </div>
                )}

                {topic.trendPercentage !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">نسبة النمو</span>
                    <span className="text-green-700 dark:text-green-400 font-bold tabular-nums">
                      +{topic.trendPercentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashSection>
  );
}

export const TrendingTopicsDashboardSection = React.memo(TrendingTopicsDashboardSectionBase);
