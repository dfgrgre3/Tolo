'use client';

import Link from 'next/link';
import { TrendingUp, ChevronLeft, Flame } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER } from '../design-system';

interface TrendingTopic {
  id: string;
  name: string;
  icon: React.ReactNode;
  students: number;
  trend: number; // +/- percentage
  category?: string;
}

const TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: 'ai-ml',
    name: 'Artificial Intelligence',
    icon: '🤖',
    students: 15420,
    trend: 45,
    category: 'Technology',
  },
  {
    id: 'web3',
    name: 'Web3 & Blockchain',
    icon: '⛓️',
    students: 12050,
    trend: 38,
    category: 'Technology',
  },
  {
    id: 'ios-dev',
    name: 'iOS Development',
    icon: '📱',
    students: 9870,
    trend: 22,
    category: 'Mobile',
  },
  {
    id: 'devops',
    name: 'DevOps & Cloud',
    icon: '☁️',
    students: 8450,
    trend: 35,
    category: 'Infrastructure',
  },
  {
    id: 'ux-design',
    name: 'UX/UI Design',
    icon: '🎨',
    students: 11230,
    trend: 28,
    category: 'Design',
  },
  {
    id: 'data-viz',
    name: 'Data Visualization',
    icon: '📊',
    students: 7620,
    trend: 42,
    category: 'Data',
  },
  {
    id: 'flutter',
    name: 'Flutter Development',
    icon: '📲',
    students: 6890,
    trend: 52,
    category: 'Mobile',
  },
  {
    id: 'next-js',
    name: 'Next.js & React',
    icon: '⚛️',
    students: 13450,
    trend: 31,
    category: 'Web',
  },
];

/**
 * Trending Topic Card Component
 */
function TrendingTopicCard({ topic }: { topic: TrendingTopic }) {
  return (
    <Link href={`/courses?topic=${topic.id}`}>
      <div className="group p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] hover:border-[#0F766E] dark:hover:border-orange-500 hover:shadow-md dark:hover:shadow-orange-500/20 transition-all duration-150 cursor-pointer">

        {/* Top Row: Icon + Trend */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-3xl">{topic.icon}</div>
          <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-500/20 rounded-full">
            <Flame className="h-3 w-3 text-red-500" />
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              +{topic.trend}%
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1E293B] dark:text-white mb-2 line-clamp-1 group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors">
          {topic.name}
        </h3>

        {/* Category */}
        {topic.category && (
          <p className="text-xs text-[#64748B] dark:text-slate-400 mb-3 font-medium">
            {topic.category}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-3 pt-3" />

        {/* Students Count */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F766E] dark:text-orange-500">
            {(topic.students / 1000).toFixed(1)}K طالب
          </span>
          <span className="text-xs text-[#64748B] dark:text-slate-400">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * TrendingTopicsSection
 *
 * Displays currently trending topics and popular subjects
 */
export function TrendingTopicsSection() {
  return (
    <section className="py-16 bg-white border-b border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-xs font-bold bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full">
                الآن محل اهتمام
              </span>
            </div>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              المواضيع الشائعة الآن
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اكتشف ما يتعلمه الآخرون في هذه اللحظة
            </p>
          </div>
          <Link
            href="/trending"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Trending Topics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {TRENDING_TOPICS.map((topic) => (
            <TrendingTopicCard key={topic.id} topic={topic} />
          ))}
        </div>

        {/* Info Bar */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-[12px]">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-bold mb-1">💡 المواضيع الشائعة تتغير بناءً على طلب السوق</p>
              <p className="text-xs opacity-90">
                اختر من المواضيع الشائعة لتبقى على اطلاع بأحدث الاتجاهات التقنية والمهارات المطلوبة
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
