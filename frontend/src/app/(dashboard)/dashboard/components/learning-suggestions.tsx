"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  Clock,
  Search,
  ArrowLeft,
} from "lucide-react";
import { getRecentSearchQueries } from "@/lib/search-history";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";

interface SuggestedCourse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  level: string;
  subject: string;
  price: number;
}

const levelLabels: Record<string, string> = {
  BEGINNER: "مبتدئ",
  INTERMEDIATE: "متوسط",
  ADVANCED: "متقدم",
};

const levelColors: Record<string, string> = {
  BEGINNER: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15",
  INTERMEDIATE: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15",
  ADVANCED: "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/15",
};

export function LearningSuggestions() {
  const [suggestions, setSuggestions] = useState<SuggestedCourse[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const searches = getRecentSearchQueries();
        setRecentSearches(searches);

        // Fetch courses and pick suggestions based on recent searches
        const res = await apiClient.get<any>("/courses?limit=20");
        const payload = res.data ?? res;
        const courses: any[] = payload.courses ?? payload.items ?? payload.subjects ?? [];

        if (searches.length > 0 && courses.length > 0) {
          // Score courses by relevance to recent searches
          const scored = courses.map((course: any) => {
            const textToSearch = [
              course.name || course.nameAr || "",
              course.description || "",
              course.instructorName || "",
              (course.tags || []).join(" "),
            ]
              .join(" ")
              .toLowerCase();

            let score = 0;
            for (const search of searches) {
              if (textToSearch.includes(search)) {
                score += 10;
              }
              // Boost if search terms appear in title
              if ((course.name || course.nameAr || "").toLowerCase().includes(search)) {
                score += 5;
              }
            }

            return { course, score };
          });

          // Filter scored courses, remove zero-scored, sort by score desc, take top 4
          const topScores = scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);

          if (topScores.length > 0) {
            setSuggestions(
              topScores.map((s) => ({
                id: s.course.id || "",
                title: s.course.name || s.course.nameAr || "",
                thumbnailUrl: s.course.thumbnailUrl,
                level: s.course.level || "BEGINNER",
                subject: s.course.subject || "",
                price: s.course.price || 0,
              }))
            );
            setLoading(false);
            return;
          }
        }

        // Fallback: show popular courses if no recent searches or no matches
        const popular = courses
          .sort(
            (a: any, b: any) =>
              (b.enrolledCount || b._count?.enrollments || 0) -
              (a.enrolledCount || a._count?.enrollments || 0)
          )
          .slice(0, 4)
          .map((c: any) => ({
            id: c.id || "",
            title: c.name || c.nameAr || "",
            thumbnailUrl: c.thumbnailUrl,
            level: c.level || "BEGINNER",
            subject: c.subject || "",
            price: c.price || 0,
          }));

        setSuggestions(popular);
      } catch (error) {
        logger.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded-full bg-muted/60" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-muted/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-[2rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5"
    >
      {/* Decorative gradient */}
      <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-tl from-sky-500/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg border border-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2">
                اقتراحات التعلم القادمة
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {recentSearches.length > 0
                  ? "استنادًا إلى عمليات البحث الأخيرة"
                  : "الأكثر تسجيلاً بين الطلاب"}
              </p>
            </div>
          </div>
          {recentSearches.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 flex-wrap max-w-[200px] justify-end">
              {recentSearches.slice(0, 3).map((q) => (
                <span
                  key={q}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                >
                  <Search className="h-3 w-3" />
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((course, index) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-card/80 to-card/40 hover:from-card hover:via-card/90 hover:to-card/60 transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4 p-4">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <GraduationCap className="h-7 w-7 text-primary/60" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h4>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        levelColors[course.level] || levelColors.INTERMEDIATE
                      }`}
                    >
                      {levelLabels[course.level] || "متوسط"}
                    </span>
                    {course.price === 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        مجاني
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 mt-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowLeft className="h-4 w-4 text-primary" />
                </div>
              </div>

              {/* Bottom Hover Glow */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-l from-primary/40 via-purple-500/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right" />
            </Link>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors group"
          >
            <BookOpen className="h-4 w-4" />
            تصفح كل الدورات
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </Link>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>مُحدَّث لحظياً</span>
          </div>
        </div>
      </div>
    </m.div>
  );
}