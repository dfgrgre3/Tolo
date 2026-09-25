'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Zap, Target, BookMarked } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION } from '../design-system';
import { apiClient } from '@/lib/api/api-client';

interface ExamFromAPI {
  id: string;
  title?: string;
  name?: string;
  subject?: string;
  description?: string;
  questionsCount?: number;
  questions_count?: number;
  difficulty?: string;
  duration?: number;
  category?: string;
}

interface ExamTrack {
  id: string;
  title: string;
  description: string;
  questionsCount: number;
  difficulty: string;
  href: string;
}

const ICONS = [BookMarked, Target, Zap, BookMarked, Target, Zap];

/**
 * ExamTrackCard Component
 */
function ExamTrackCard({ track, index }: { track: ExamTrack; index: number }) {
  const Icon = ICONS[index % ICONS.length] ?? Target;

  return (
    <Link href={track.href}>
      <div className={`
        h-full p-4 bg-white dark:bg-slate-800
        border border-[#E2E8F0] dark:border-slate-700
        rounded-[12px]
        hover:border-[#0F766E] dark:hover:border-orange-500
        hover:shadow-md dark:hover:shadow-orange-500/20
        group transition-all duration-150
      `}>
        {/* Icon */}
        <div className={`
          h-11 w-11 rounded-xl
          bg-emerald-50 dark:bg-orange-500/20
          text-[#0F766E] dark:text-orange-500
          flex items-center justify-center mb-3
          group-hover:bg-[#0F766E] dark:group-hover:bg-orange-600
          group-hover:text-white transition-colors duration-150
        `}>
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1E293B] dark:text-white mb-1.5 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
          {track.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#64748B] dark:text-slate-400 mb-3 line-clamp-2">
          {track.description}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] dark:border-slate-700">
          <span className="text-xs font-semibold text-[#0F766E] dark:text-orange-500">
            {track.questionsCount > 0 ? `${track.questionsCount} سؤال` : 'امتحان متاح'}
          </span>
          <span className="text-xs px-2 py-1 bg-[#F8FAFC] dark:bg-slate-700 text-[#64748B] dark:text-slate-300 rounded-full font-medium">
            {track.difficulty}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton for loading state */
function ExamSkeleton() {
  return (
    <div className="h-full p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-700 mb-3" />
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded mb-3" />
      <div className="h-6 w-full bg-slate-50 dark:bg-slate-700 rounded" />
    </div>
  );
}

/**
 * ExamPreparationSection
 *
 * Fetches real exams from the backend API and displays them.
 * Previously used hardcoded EXAM_TRACKS data.
 */
export function ExamPreparationSection() {
  const [tracks, setTracks] = useState<ExamTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient.get<ExamFromAPI[] | { items?: ExamFromAPI[]; data?: ExamFromAPI[] }>('/exams?limit=6')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : (data as { items?: ExamFromAPI[]; data?: ExamFromAPI[] }).items
            || (data as { items?: ExamFromAPI[]; data?: ExamFromAPI[] }).data
            || [];

        const mapped: ExamTrack[] = list
          .filter((e) => e.title || e.name || e.subject)
          .map((e) => ({
            id: e.id,
            title: e.title || e.name || e.subject || 'امتحان',
            description: e.description || `امتحان في ${e.title || e.name || e.subject || 'مادة'}`,
            questionsCount: e.questionsCount || e.questions_count || 0,
            difficulty: e.difficulty || 'متنوع',
            href: `/courses?exam=${e.id}`,
          }))
          .slice(0, 6);

        setTracks(mapped);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Hide section when no real exams available
  if (!loading && tracks.length === 0) return null;

  return (
    <section className={`${SECTION.padding} bg-gradient-to-b from-white to-[#F8FAFC] dark:from-slate-900 dark:to-slate-950`}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🎯 استعد للامتحانات
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              امتحانات حقيقية للتدرب والتحضير
            </p>
          </div>
          <Link
            href="/courses?category=exams"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Exam Tracks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ExamSkeleton key={i} />)
            : tracks.map((track, i) => (
                <ExamTrackCard key={track.id} track={track} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
}
