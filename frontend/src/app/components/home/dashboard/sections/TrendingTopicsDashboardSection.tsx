'use client';

import { TrendingUp, Flame } from 'lucide-react';

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

/**
 * المواضيع الشائعة الآن
 * نسخة من صفحة الزائرين مخصصة للمستخدمين المسجلين
 */
export function TrendingTopicsDashboardSection({
  topics = [],
  loading = false
}: TrendingTopicsDashboardSectionProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            المواضيع الشائعة الآن 🔥
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            اكتشف أكثر المواضيع طلباً في هذه اللحظة
          </p>
        </div>

        {/* Topics Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-4 bg-muted border border-input rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-40" />
            لا توجد مواضيع شائعة متاحة حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-5 bg-gradient-to-br from-card to-card/50 border border-input rounded-lg hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {topic.name}
                    </h3>
                    {topic.category && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {topic.category}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">
                    <Flame className="h-3 w-3" />
                    <span>الآن</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {topic.studentCount !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">الطلاب المهتمين</span>
                      <span className="text-foreground font-bold">
                        {topic.studentCount.toLocaleString('ar-SA')}
                      </span>
                    </div>
                  )}

                  {topic.courseCount !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">عدد الكورسات</span>
                      <span className="text-foreground font-bold">
                        {topic.courseCount}
                      </span>
                    </div>
                  )}

                  {topic.trendPercentage !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">نسبة النمو</span>
                      <span className="text-green-600 font-bold">
                        +{topic.trendPercentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
