'use client';

import Link from 'next/link';
import { Award, ChevronLeft, Clock, BookOpen } from 'lucide-react';

interface SpecializationProgram {
  id: string;
  title: string;
  description?: string;
  courseCount?: number;
  duration?: string;
  icon?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  slug: string;
}

interface SpecializationProgramsSectionProps {
  programs?: SpecializationProgram[];
  loading?: boolean;
}

const LEVEL_LABELS = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم'
};

/**
 * 🎖️ برامج التخصص المتقدمة
 * نسخة من صفحة الزائرين مخصصة للمستخدمين المسجلين
 */
export function SpecializationProgramsSection({
  programs = [],
  loading = false
}: SpecializationProgramsSectionProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              🎖️ برامج التخصص المتقدمة
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              اصبح متخصصاً معترفاً به في مجالك
            </p>
          </div>
          <Link
            href="/specializations"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors w-fit"
          >
            عرض جميع البرامج <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Programs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-muted border border-input rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-input">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-sm text-muted-foreground font-bold">
              لا توجد برامج متخصصة متاحة حالياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={`/specializations/${program.slug}`}
                className="group overflow-hidden rounded-lg border border-input hover:border-primary/50 hover:shadow-lg transition-all"
              >
                {/* Header Gradient */}
                <div
                  className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform"
                  role="img"
                  aria-label={program.title}
                >
                  {program.icon || '🎯'}
                </div>

                {/* Content */}
                <div className="p-5 bg-card">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {program.title}
                  </h3>

                  {program.description && (
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4 text-xs">
                    {program.courseCount !== undefined && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{program.courseCount} كورس</span>
                      </div>
                    )}

                    {program.duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{program.duration}</span>
                      </div>
                    )}

                    {program.level && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                          {LEVEL_LABELS[program.level]}
                        </span>
                      </div>
                    )}
                  </div>

                  <button className="w-full py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 transition-colors">
                    ابدأ البرنامج
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
