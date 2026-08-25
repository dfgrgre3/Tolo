'use client';

import Link from 'next/link';
import { ChevronLeft, Zap, Target, BookMarked } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, GRIDS } from '../design-system';

interface ExamTrack {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  courses: number;
  difficulty: string;
  href: string;
}

const EXAM_TRACKS: ExamTrack[] = [
  {
    id: 'tawjihi',
    title: 'الثانوية العامة',
    icon: <BookMarked className="h-6 w-6" />,
    description: 'تحضير شامل لامتحانات الثانوية العامة',
    courses: 24,
    difficulty: 'متقدم',
    href: '/courses?exam=tawjihi',
  },
  {
    id: 'university',
    title: 'امتحانات الجامعة',
    icon: <Target className="h-6 w-6" />,
    description: 'كورسات مخصصة للتحضير الجامعي',
    courses: 18,
    difficulty: 'متقدم',
    href: '/courses?exam=university',
  },
  {
    id: 'ielts',
    title: 'IELTS',
    icon: <Zap className="h-6 w-6" />,
    description: 'تحضير متخصص لامتحان IELTS',
    courses: 12,
    difficulty: 'متوسط',
    href: '/courses?exam=ielts',
  },
  {
    id: 'toefl',
    title: 'TOEFL',
    icon: <Zap className="h-6 w-6" />,
    description: 'كورسات TOEFL بشهادات معتمدة',
    courses: 10,
    difficulty: 'متقدم',
    href: '/courses?exam=toefl',
  },
  {
    id: 'certifications',
    title: 'شهادات مهنية',
    icon: <Target className="h-6 w-6" />,
    description: 'شهادات احترافية معترف بها عالمياً',
    courses: 20,
    difficulty: 'متقدم',
    href: '/courses?exam=certifications',
  },
  {
    id: 'placement',
    title: 'اختبارات التصنيف',
    icon: <BookMarked className="h-6 w-6" />,
    description: 'تحضير لاختبارات القبول والتصنيف',
    courses: 15,
    difficulty: 'متوسط',
    href: '/courses?exam=placement',
  },
];

/**
 * ExamTrackCard Component
 */
function ExamTrackCard({ track }: { track: ExamTrack }) {
  return (
    <Link href={track.href}>
      <div className={`
        h-full p-6 bg-white dark:bg-slate-800
        border border-[#E2E8F0] dark:border-slate-700
        rounded-[12px]
        hover:border-[#0F766E] dark:hover:border-orange-500
        hover:shadow-md dark:hover:shadow-orange-500/20
        group transition-all duration-150
      `}>
        {/* Icon */}
        <div className={`
          h-12 w-12 rounded-xl
          bg-emerald-50 dark:bg-orange-500/20
          text-[#0F766E] dark:text-orange-500
          flex items-center justify-center mb-4
          group-hover:bg-[#0F766E] dark:group-hover:bg-orange-600
          group-hover:text-white transition-colors duration-150
        `}>
          {track.icon}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[#1E293B] dark:text-white mb-2 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
          {track.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#64748B] dark:text-slate-400 mb-4 line-clamp-2">
          {track.description}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-slate-700">
          <span className="text-xs font-semibold text-[#0F766E] dark:text-orange-500">
            {track.courses} كورس
          </span>
          <span className="text-xs px-2 py-1 bg-[#F8FAFC] dark:bg-slate-700 text-[#64748B] dark:text-slate-300 rounded-full font-medium">
            {track.difficulty}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * ExamPreparationSection
 *
 * Displays specialized exam preparation tracks
 * to help students prepare for specific exams
 */
export function ExamPreparationSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#E2E8F0] dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🎯 استعد للامتحانات
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              مسارات تحضير متخصصة لامتحانات مهمة
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
        <div className={GRIDS.courses}>
          {EXAM_TRACKS.map((track) => (
            <ExamTrackCard key={track.id} track={track} />
          ))}
        </div>
      </div>
    </section>
  );
}
