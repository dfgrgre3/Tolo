"use client";

import { memo } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, BookOpen } from "lucide-react";
import { rpgCommonStyles } from "../shared/styles";
import { useCourseProgress } from "../hooks/useDashboardData";

/**
 * Shows the learner's enrolled courses with completion computed from the
 * lessons they have actually finished.
 */
export const CoursesProgressSection = memo(function CoursesProgressSection() {
  const { courses, completed, inProgress, averagePercent, loading, error } = useCourseProgress();

  if (loading) {
    return (
      <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12`}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div key={key} className="h-40 rounded-2xl bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 text-center`}>
        <p className="text-red-400 font-bold">{error}</p>
      </section>
    );
  }

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <GraduationCap className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className={`text-3xl md:text-4xl font-black ${rpgCommonStyles.neonText} mb-1`}>
                كورساتي
              </h2>
              <p className="text-gray-400 text-base">
                {courses.length > 0
                  ? `${completed} مكتمل · ${inProgress} قيد الدراسة · متوسط الإنجاز ${averagePercent}%`
                  : "لم تسجل في أي كورس بعد"}
              </p>
            </div>
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold hover:bg-white/10"
          >
            تصفح الكورسات
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-500 mb-2">لا توجد كورسات مسجلة</p>
            <p className="text-sm text-gray-600">سجّل في كورس لتتابع تقدمك هنا</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.enrollmentId}
              >
                <Link
                  href={`/courses/${course.id}`}
                  className="block rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-emerald-500/40 hover:bg-white/[0.07] h-full"
                >
                  <h3 className="font-black text-lg text-gray-100 mb-4 line-clamp-2">
                    {course.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>
                      {course.doneLessons} من {course.totalLessons} درس
                    </span>
                    <span className="font-bold text-emerald-400">{course.progress}%</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default CoursesProgressSection;
