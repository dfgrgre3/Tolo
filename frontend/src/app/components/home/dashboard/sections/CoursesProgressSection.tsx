"use client";

import { memo } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DashSection, DashEmpty } from "../shared/SectionShell";
import { DASH_GRID, DASH_PROGRESS } from "../shared/design-system";
import { useCourseProgress } from "../hooks/useDashboardData";

/**
 * Shows the learner's enrolled courses with completion computed from the
 * lessons they have actually finished.
 */
export const CoursesProgressSection = memo(function CoursesProgressSection() {
  const { courses, completed, inProgress, averagePercent, loading, error } = useCourseProgress();

  if (loading) {
    return (
      <DashSection title="كورساتي" subtitle="جاري تحميل تقدمك…">
        <div className={DASH_GRID.cards3}>
          {[1, 2, 3].map((key) => (
            <div key={key} className="h-32 rounded-xl bg-muted border border-border animate-pulse" />
          ))}
        </div>
      </DashSection>
    );
  }

  if (error) {
    return (
      <DashSection title="كورساتي" subtitle={error}>
        <DashEmpty icon={BookOpen} title="تعذر تحميل كورساتك" description={error} />
      </DashSection>
    );
  }

  return (
    <DashSection
      title="كورساتي"
      subtitle={
        courses.length > 0
          ? `${completed} مكتمل · ${inProgress} قيد الدراسة · متوسط الإنجاز ${averagePercent}%`
          : "لم تسجل في أي كورس بعد"
      }
      href="/courses"
      linkLabel="تصفح الكورسات"
    >
      {courses.length === 0 ? (
        <DashEmpty
          icon={BookOpen}
          title="لا توجد كورسات مسجلة"
          description="سجّل في كورس لتتابع تقدمك هنا"
        />
      ) : (
        <div className={DASH_GRID.cards3}>
          {courses.map((course) => (
            <Link
              key={course.enrollmentId}
              href={`/courses/${course.id}`}
              className="block rounded-xl bg-muted/40 border border-border p-4 hover:border-primary transition-colors h-full"
            >
              <h3 className="font-black text-sm text-foreground mb-3 line-clamp-2">
                {course.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="font-medium">
                  {course.doneLessons} من {course.totalLessons} درس
                </span>
                <span className="font-black text-primary-strong tabular-nums">{course.progress}%</span>
              </div>

              <div className={DASH_PROGRESS.track}>
                <div className={DASH_PROGRESS.bar} style={{ width: `${course.progress}%` }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashSection>
  );
});

export default CoursesProgressSection;
