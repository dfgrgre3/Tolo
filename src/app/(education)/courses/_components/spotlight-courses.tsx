"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { ArrowLeft, Clock3, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHours } from "./utils";
import type { CourseSummary } from "./types";

export function SpotlightCourses({ courses }: { courses: CourseSummary[] }) {
  if (courses.length === 0) return null;

  return (
    <section className="mt-10 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-sky-600 dark:text-sky-300">
            ترشيحات جاهزة
          </p>
          <h2 className="text-2xl font-black">أفضل ما يمكن البدء به الآن</h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {courses.map((course, index) => (
          <m.div
            key={course.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-slate-950/75 dark:shadow-none"
          >
            <div className="absolute left-0 top-0 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="relative space-y-4">
              <Badge className="rounded-full border-0 bg-slate-950 px-3 py-1 text-white dark:bg-white dark:text-slate-950">
                {index === 0 ? "الأكثر جذبًا" : index === 1 ? "الأعلى تقييمًا" : "مقترحة لك"}
              </Badge>
              <h3 className="text-2xl font-black">{course.title}</h3>
              <p className="line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {course.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-500" />
                  {course.enrolledCount?.toLocaleString("ar-EG") || "٠"} طالب
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-orange-500" />
                  {formatHours(course.duration)}
                </span>
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-current text-amber-400" />
                  {(course.rating || 0).toFixed(1)}
                </span>
              </div>

              <Button
                asChild
                className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
              >
                <Link href={`/courses/${course.id}`} className="flex items-center gap-2">
                  افتح صفحة الدورة
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </m.div>
        ))}
      </div>
    </section>
  );
}
