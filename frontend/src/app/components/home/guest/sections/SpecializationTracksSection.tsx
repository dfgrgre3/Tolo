'use client';

import Link from 'next/link';
import { ChevronLeft, Award, Clock, BarChart3 } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER } from '../design-system';

interface SpecializationTrack {
  id: string;
  title: string;
  description: string;
  coursesCount: number;
  duration: string;
  certification: string;
  level: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const SPECIALIZATION_TRACKS: SpecializationTrack[] = [
  {
    id: 'web-dev',
    title: 'Web Development Professional',
    description: 'Master modern web development with React, Node.js, and AWS',
    coursesCount: 12,
    duration: '16 weeks',
    certification: 'Professional Certificate',
    level: 'Advanced',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-500/20 dark:to-cyan-500/20',
  },
  {
    id: 'data-science',
    title: 'Data Science Specialist',
    description: 'Learn Python, ML, Deep Learning and Big Data Analytics',
    coursesCount: 14,
    duration: '20 weeks',
    certification: 'Specialist Certificate',
    level: 'Advanced',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-500/20 dark:to-pink-500/20',
  },
  {
    id: 'mobile-dev',
    title: 'Mobile Development Expert',
    description: 'Build native and cross-platform mobile applications',
    coursesCount: 10,
    duration: '14 weeks',
    certification: 'Expert Certificate',
    level: 'Advanced',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-50 to-red-50 dark:from-orange-500/20 dark:to-red-500/20',
  },
  {
    id: 'cloud-devops',
    title: 'Cloud & DevOps Engineer',
    description: 'Master AWS, Docker, Kubernetes and infrastructure automation',
    coursesCount: 11,
    duration: '12 weeks',
    certification: 'Engineer Certificate',
    level: 'Advanced',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 to-teal-50 dark:from-green-500/20 dark:to-teal-500/20',
  },
  {
    id: 'ai-ml',
    title: 'AI & Machine Learning',
    description: 'Deep dive into AI, Neural Networks and Advanced ML',
    coursesCount: 13,
    duration: '18 weeks',
    certification: 'Specialist Certificate',
    level: 'Expert',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-indigo-500 to-purple-500',
    bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-500/20 dark:to-purple-500/20',
  },
  {
    id: 'ui-ux',
    title: 'UX/UI Design Master',
    description: 'Professional design thinking, prototyping and user research',
    coursesCount: 9,
    duration: '10 weeks',
    certification: 'Master Certificate',
    level: 'Advanced',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-500/20 dark:to-rose-500/20',
  },
];

/**
 * Specialization Track Card Component
 */
function SpecializationCard({ track }: { track: SpecializationTrack }) {
  return (
    <Link href="/pathways">
      <div className="group h-full flex flex-col bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden hover:shadow-xl dark:hover:shadow-orange-500/30 transition-all duration-150">

        {/* Header Gradient */}
        <div className={`bg-gradient-to-r ${track.color} p-4 text-white`}>
          <div className="flex items-start justify-between mb-2.5">
            <div className="text-2xl opacity-70">{track.icon}</div>
            <Award className="h-4 w-4 opacity-70" />
          </div>
          <h3 className="text-base font-bold mb-1.5">
            {track.title}
          </h3>
          <p className="text-sm opacity-90 line-clamp-2">
            {track.description}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-[#E2E8F0] dark:border-slate-700">
            <div className="text-center">
              <div className="text-xl font-black text-[#0F766E] dark:text-orange-500">
                {track.coursesCount}
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">كورس</p>
            </div>
            <div className="text-center">
              <Clock className="h-4 w-4 text-[#0F766E] dark:text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-[#64748B] dark:text-slate-400">{track.duration}</p>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold px-2 py-1 bg-[#F8FAFC] dark:bg-slate-700 text-[#0F766E] dark:text-orange-500 rounded-full">
                {track.level}
              </div>
            </div>
          </div>

          {/* Certification */}
          <div className="mb-4 flex-1">
            <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium mb-1.5">
              الشهادة المعترف بها:
            </p>
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">
              {track.certification}
            </p>
          </div>

          {/* CTA Button */}
          <button className="w-full px-4 py-2 bg-gradient-to-r from-[#0F766E] to-[#115E59] dark:from-orange-600 dark:to-orange-700 text-white font-bold text-sm rounded-[8px] hover:shadow-lg transition-all group-hover:scale-105">
            ابدأ التتبع
          </button>
        </div>
      </div>
    </Link>
  );
}

/**
 * SpecializationTracksSection
 *
 * Displays advanced specialization programs
 */
export function SpecializationTracksSection() {
  return (
    <section className="py-10 bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#E2E8F0] dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🎖️ برامج التخصص المتقدمة
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              مسارات احترافية معتمدة للوصول إلى مستوى الخبير
            </p>
          </div>
          <Link
            href="/pathways"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض جميع البرامج <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Specialization Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPECIALIZATION_TRACKS.map((track) => (
            <SpecializationCard key={track.id} track={track} />
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-orange-500/10 dark:to-orange-600/10 border border-emerald-200 dark:border-orange-500/30 rounded-[12px]">
          <div className="flex items-start gap-4">
            <Award className="h-6 w-6 text-emerald-600 dark:text-orange-500 shrink-0 mt-1" />
            <div>
              <p className="text-sm font-bold text-[#1E293B] dark:text-white mb-1">
                شهادات معترف بها عالميًا
              </p>
              <p className="text-sm text-[#64748B] dark:text-slate-400">
                جميع برامجنا تقدم شهادات معتمدة يمكنك إضافتها إلى LinkedIn وسيرتك الذاتية
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
