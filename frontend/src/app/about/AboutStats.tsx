'use client';

import { useEffect, useState } from 'react';
import { fetchHomepageStatsRaw } from '@/features/courses/api/courses-gateway';
import type { HomepageResponse, PlatformStats } from '@/app/components/home/guest/types';

/**
 * Client component that fetches real platform stats from GET /api/v1/homepage
 * and displays them in the About page. Shows skeleton while loading and
 * gracefully hides when data is unavailable.
 */
export function AboutStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchHomepageStatsRaw<HomepageResponse>()
      .then((data) => {
        if (cancelled) return;
        if (data.stats) {
          setStats({
            courses: data.stats.totalCourses,
            students: data.stats.totalStudents,
            instructors: data.stats.totalTeachers,
            enrollments: data.stats.totalEnrollments,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const items = stats
    ? [
        { value: stats.students.toLocaleString('ar-EG'), label: 'طالب مسجّل' },
        { value: stats.courses.toLocaleString('ar-EG'), label: 'كورس متاح' },
        { value: stats.instructors.toLocaleString('ar-EG'), label: 'مدرس معتمد' },
        { value: stats.enrollments.toLocaleString('ar-EG'), label: 'عملية تسجيل' },
      ]
    : [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="py-6 border-t border-border text-center">
            <div className="h-8 w-20 bg-muted rounded mx-auto mb-2 animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded mx-auto animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((stat, i) => (
        <div key={i} className="py-6 border-t border-border text-center">
          <p className="text-3xl font-black text-primary-strong">{stat.value}</p>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
