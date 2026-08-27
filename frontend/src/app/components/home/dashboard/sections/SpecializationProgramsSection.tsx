'use client';

import React from 'react';
import Link from 'next/link';
import { Award, Clock, BookOpen } from 'lucide-react';
import { DashSection, DashEmpty } from '../shared/SectionShell';
import { DASH_RAIL } from '../shared/design-system';

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

/** Module-level constants keep prop identities stable across parent renders. */
const EMPTY_PROGRAMS: SpecializationProgram[] = [];

/**
 * برامج التخصص المتقدمة — Noon rail of program cards inside the shared panel.
 */
function SpecializationProgramsSectionBase({
  programs = EMPTY_PROGRAMS,
  loading = false
}: SpecializationProgramsSectionProps) {
  return (
    <DashSection
      title="برامج التخصص المتقدمة"
      subtitle="اصبح متخصصاً معترفاً به في مجالك"
      href="/pathways"
      linkLabel="عرض جميع البرامج"
      rail
    >
      {loading ? (
        <div className={DASH_RAIL.container}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`${DASH_RAIL.item} w-72 h-72 bg-muted border border-border rounded-xl animate-pulse`}
            />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <DashEmpty
          icon={Award}
          title="لا توجد برامج متخصصة متاحة حالياً"
        />
      ) : (
        <div className={DASH_RAIL.container}>
          {programs.map((program) => (
            <Link
              key={program.id}
              href="/pathways"
              className={`${DASH_RAIL.item} group flex w-72 flex-col overflow-hidden rounded-xl border border-border hover:border-primary transition-colors`}
            >
              {/* Icon header */}
              <div
                className="flex h-20 items-center justify-center bg-muted/60 border-b border-border text-4xl"
                role="img"
                aria-label={program.title}
              >
                <span className="transition-transform group-hover:scale-110">{program.icon || '🎯'}</span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-black text-sm text-foreground group-hover:text-primary-strong transition-colors line-clamp-2 mb-1.5">
                  {program.title}
                </h3>

                {program.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {program.description}
                  </p>
                )}

                <div className="mb-4 space-y-1.5 text-xs text-muted-foreground">
                  {program.courseCount !== undefined && (
                    <p className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="h-3.5 w-3.5 text-primary-strong" aria-hidden="true" />
                      {program.courseCount} كورس
                    </p>
                  )}

                  {program.duration && (
                    <p className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary-strong" aria-hidden="true" />
                      {program.duration}
                    </p>
                  )}

                  {program.level && (
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary-strong text-[11px] font-black rounded-md w-fit">
                      {LEVEL_LABELS[program.level]}
                    </span>
                  )}
                </div>

                <button className="mt-auto w-full py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:opacity-90 transition-opacity">
                  ابدأ البرنامج
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashSection>
  );
}

export const SpecializationProgramsSection = React.memo(SpecializationProgramsSectionBase);
