'use client';

import Link from 'next/link';
import { ChevronLeft, BookOpen, Zap } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER } from '../design-system';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  coursesCount: number;
  level: string;
  duration: string;
  image?: string;
  icon?: React.ReactNode;
  progress?: number;
}

const SAMPLE_PATHS: LearningPath[] = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    description: 'تعلم HTML, CSS, JavaScript, React وبناء تطبيقات ويب احترافية',
    coursesCount: 8,
    level: 'Beginner → Advanced',
    duration: '12 weeks',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    description: 'Node.js, databases, APIs والبنية التحتية للتطبيقات',
    coursesCount: 7,
    level: 'Beginner → Advanced',
    duration: '14 weeks',
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    id: 'fullstack',
    title: 'Full Stack Developer',
    description: 'مسار متكامل لتصبح full stack engineer',
    coursesCount: 15,
    level: 'Intermediate → Advanced',
    duration: '24 weeks',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: 'data-science',
    title: 'Data Science',
    description: 'Python, Data Analysis, Machine Learning والـ Big Data',
    coursesCount: 10,
    level: 'Beginner → Advanced',
    duration: '16 weeks',
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    id: 'mobile',
    title: 'Mobile Developer',
    description: 'Flutter, React Native وبناء تطبيقات موبايل احترافية',
    coursesCount: 6,
    level: 'Intermediate → Advanced',
    duration: '12 weeks',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: 'cloud',
    title: 'Cloud & DevOps',
    description: 'AWS, Docker, Kubernetes والبنية السحابية الحديثة',
    coursesCount: 8,
    level: 'Intermediate → Advanced',
    duration: '10 weeks',
    icon: <BookOpen className="h-6 w-6" />,
  },
];

/**
 * Learning Path Card Component
 */
function LearningPathCard({ path }: { path: LearningPath }) {
  return (
    <Link href={`/learning-paths/${path.id}`}>
      <div className="group h-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden hover:shadow-lg dark:hover:shadow-orange-500/20 transition-all duration-150">

        {/* Header with Icon */}
        <div className="p-6 bg-gradient-to-br from-emerald-50 dark:from-orange-500/20 to-emerald-100/50 dark:to-orange-600/20">
          <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-700 text-[#0F766E] dark:text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            {path.icon}
          </div>
          <h3 className="text-lg font-bold text-[#1E293B] dark:text-white mb-2 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
            {path.title}
          </h3>
          <p className="text-sm text-[#64748B] dark:text-slate-400 line-clamp-2">
            {path.description}
          </p>
        </div>

        {/* Info Row */}
        <div className="p-6 space-y-3">
          {/* Level & Duration */}
          <div className="flex items-center justify-between">
            <span className="text-xs px-2.5 py-1 bg-[#F8FAFC] dark:bg-slate-700 text-[#64748B] dark:text-slate-400 rounded-full font-medium">
              {path.level}
            </span>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              ⏱️ {path.duration}
            </span>
          </div>

          {/* Courses Count */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-slate-700">
            <span className="text-sm font-bold text-[#1E293B] dark:text-white">
              {path.coursesCount} كورس
            </span>
            <button className="px-4 py-2 bg-[#0F766E] dark:bg-orange-600 text-white text-xs font-bold rounded-[8px] hover:bg-[#115E59] dark:hover:bg-orange-700 transition-colors">
              ابدأ الآن
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * LearningPathsSection
 *
 * Displays structured learning paths for different career tracks
 */
export function LearningPathsSection() {
  return (
    <section className="py-16 bg-white border-b border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              🎓 مسارات التعلم المنظمة
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              تتابع محدد يأخذك من المبتدئ إلى الخبير في مجالك
            </p>
          </div>
          <Link
            href="/learning-paths"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض جميع المسارات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Paths Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_PATHS.map((path) => (
            <LearningPathCard key={path.id} path={path} />
          ))}
        </div>
      </div>
    </section>
  );
}
