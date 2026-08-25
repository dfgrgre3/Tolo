'use client';

import Link from 'next/link';
import { ChevronLeft, MapPin, Users, BookOpen } from 'lucide-react';

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

/**
 * 🎓 مسارات التعلم المنظمة
 * نسخة من صفحة الزائرين مخصصة للمستخدمين المسجلين
 */
export function LearningPathsDashboardSection({
  paths = [],
  loading = false
}: LearningPathsDashboardSectionProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              🎓 مسارات التعلم المنظمة
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              تعلم بطريقة منظمة مع خارطة طريق واضحة
            </p>
          </div>
          <Link
            href="/learning-paths"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors w-fit"
          >
            عرض جميع المسارات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Paths Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-56 bg-muted border border-input rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : paths.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-input">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-sm text-muted-foreground font-bold">
              لا توجد مسارات تعلم متاحة حالياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paths.map((path) => (
              <Link
                key={path.id}
                href={`/learning-paths/${path.slug}`}
                className="group relative overflow-hidden rounded-lg border border-input hover:border-primary/50 hover:shadow-lg transition-all bg-card"
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-6 space-y-4">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {path.icon || '🗺️'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
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
                    <div className="flex gap-2">
                      <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                        {LEVEL_LABELS[path.level]}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                    {path.courseCount !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">الكورسات</p>
                        <p className="text-sm font-bold text-foreground">{path.courseCount}</p>
                      </div>
                    )}

                    {path.enrolledCount !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">الملتحقين</p>
                        <p className="text-sm font-bold text-foreground">
                          {(path.enrolledCount / 1000).toFixed(1)}K
                        </p>
                      </div>
                    )}

                    {path.duration && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <span className="text-lg">⏱️</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">المدة</p>
                        <p className="text-sm font-bold text-foreground">{path.duration}</p>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button className="w-full py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 transition-colors">
                    ابدأ المسار
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
