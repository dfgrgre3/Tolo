import { BookOpen, Users, GraduationCap, Award } from 'lucide-react';
import type { PlatformStats } from '../types';

interface StatsStripProps {
  stats: PlatformStats | null;
}

/**
 * Platform counters shown over the hero. Renders nothing until real numbers
 * arrive, so the page never displays placeholder totals.
 */
export function StatsStrip({ stats }: StatsStripProps) {
  if (!stats) return null;

  const items = [
    { icon: BookOpen, value: stats.courses, label: 'كورس تدريبي', color: 'bg-[#F59E0B]/20' },
    { icon: Users, value: stats.students, label: 'طالب مسجّل', color: 'bg-emerald-400/20' },
    { icon: GraduationCap, value: stats.instructors, label: 'مدرب', color: 'bg-blue-400/20' },
    { icon: Award, value: stats.enrollments, label: 'عملية تسجيل', color: 'bg-purple-400/20' },
  ];

  return (
    <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ icon: Icon, value, label, color }) => (
        <div
          key={label}
          className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
        >
          <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {value.toLocaleString('ar-EG')}
          </div>
          <div className="text-xs text-white/70 font-medium mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Dark variant of the same counters, used lower on the page. */
export function AchievementStrip({ stats }: StatsStripProps) {
  if (!stats) return null;

  const items = [
    { value: stats.students, label: 'طالب مسجّل', icon: Users },
    { value: stats.courses, label: 'كورس متاح', icon: BookOpen },
    { value: stats.instructors, label: 'مدرب', icon: GraduationCap },
    { value: stats.enrollments, label: 'عملية تسجيل', icon: Award },
  ];

  return (
    <section className="py-16 bg-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {items.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center">
              <Icon className="h-8 w-8 text-[#F59E0B] mb-3" />
              <div className="text-3xl sm:text-4xl font-black text-white mb-1">
                {value.toLocaleString('ar-EG')}
              </div>
              <div className="text-sm text-white/60 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
