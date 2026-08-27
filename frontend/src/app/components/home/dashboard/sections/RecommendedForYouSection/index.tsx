"use client";

import { useState, useEffect, memo, useCallback, useRef } from "react";
import { safeFetch } from "@/lib/safe-client-utils";
import { Sparkles, History, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { logger } from "@/lib/logger";
import { DashSection, DashEmpty } from "../../shared/SectionShell";
import { DASH_RAIL, DASH_TABS, DASH_BUTTON, DASH_CARD, DASH_SKELETON } from "../../shared/design-system";
import { RecommendedCourseCard } from "./RecommendedCourseCard";

interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  rating: number;
  studentsCount: number;
  duration: string;
  level: string;
  image?: string;
  matchReason: string;
  matchScore: number;
}

interface SearchHistoryItem {
  query: string;
  timestamp: string;
}

export const RecommendedForYouSection = memo(function RecommendedForYouSection() {
  const [courses, setCourses] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"recommended" | "history">("recommended");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchRecommendedCourses = useCallback(async (pageNum: number = 1) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await safeFetch<{
        recommendations: RecommendedCourse[];
        searchHistory?: SearchHistoryItem[];
        totalPages?: number;
        page?: number;
        message?: string;
      }>(
        `/api/ai/recommendations?page=${pageNum}&limit=8`,
        { signal: controller.signal },
        null
      );

      // Ignore response if request was aborted or component unmounted
      if (controller.signal.aborted || !isMountedRef.current) return;

      if (fetchError || !data) {
        // Ignore abort errors
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.debug("Fetch aborted as expected");
          return;
        }
        logger.warn("Failed to fetch recommended courses:", fetchError);
        setError("فشل في تحميل التوصيات. يرجى المحاولة مرة أخرى.");
        setCourses([]);
        return;
      }

      // The backend already returns every field in its final shape.
      setCourses(data.recommendations || []);
      setSearchHistory(data.searchHistory || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted || !isMountedRef.current) return;

      // Ignore abort errors that are expected (user navigation, component unmount, etc.)
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug("Request aborted as expected");
        return;
      }

      logger.error("Error fetching recommended courses:", err);
      setError("حدث خطأ أثناء تحميل التوصيات");
      setCourses([]);
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRecommendedCourses(page);
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [page, fetchRecommendedCourses]);

  const handleRefresh = () => {
    if (page === 1) {
      fetchRecommendedCourses(1);
    } else {
      setPage(1);
    }
  };

  return (
    <DashSection
      title="موصى به لك"
      subtitle="دورات مختارة خصيصاً لك بناءً على سجل بحثك واهتماماتك الدراسية"
      icon={Sparkles}
      action={
        activeTab === "recommended" ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className={`${DASH_BUTTON.icon} ${loading ? "animate-spin" : ""}`}
            title="تحديث التوصيات"
            aria-label="تحديث التوصيات"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : undefined
      }
      toolbar={
        <div role="tablist" aria-label="تبويب التوصيات" className={DASH_TABS.list}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "recommended"}
            onClick={() => setActiveTab("recommended")}
            className={`${DASH_TABS.tab} inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              activeTab === "recommended" ? DASH_TABS.tabActive : DASH_TABS.tabIdle
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            الدورات الموصى بها
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`${DASH_TABS.tab} inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              activeTab === "history" ? DASH_TABS.tabActive : DASH_TABS.tabIdle
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            سجل البحث
          </button>
        </div>
      }
    >
      {activeTab === "recommended" ? (
        loading ? (
          <div className={DASH_RAIL.container}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${DASH_RAIL.item} w-80`}>
                <div className={`${DASH_SKELETON.card} h-64 w-full`} />
              </div>
            ))}
          </div>
        ) : error && courses.length === 0 ? (
          <DashEmpty
            icon={Search}
            title="تعذر تحميل التوصيات"
            description={error}
            action={
              <button onClick={handleRefresh} className={DASH_BUTTON.outline}>
                إعادة المحاولة
              </button>
            }
          />
        ) : courses.length === 0 ? (
          <DashEmpty
            icon={Search}
            title="لا توجد توصيات حتى الآن"
            description="ابحث عن دورات لنقدم لك توصيات مخصصة"
          />
        ) : (
          <>
            <div className={DASH_RAIL.container}>
              {courses.map((course, index) => (
                <div key={course.id} className={`${DASH_RAIL.item} w-80`}>
                  <RecommendedCourseCard course={course} index={index} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`${DASH_BUTTON.outline} px-3 py-1.5 text-xs disabled:opacity-40`}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  السابق
                </button>
                <span className="px-2 text-xs font-bold text-muted-foreground tabular-nums">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`${DASH_BUTTON.outline} px-3 py-1.5 text-xs disabled:opacity-40`}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )
      ) : (
        <div className="max-w-2xl">
          {searchHistory.length === 0 ? (
            <DashEmpty
              icon={History}
              title="لا يوجد سجل بحث"
              description="ابحث عن دورات لتظهر هنا"
            />
          ) : (
            <div className="space-y-2">
              {searchHistory.map((item, index) => (
                <div
                  key={index}
                  className={`${DASH_CARD.inner} flex items-center gap-3 p-3 hover:border-primary/40 transition-colors`}
                >
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <History className="h-4 w-4 text-primary-strong" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{item.query}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {new Date(item.timestamp).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("recommended")}
                    className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-black text-primary-strong hover:bg-primary/20 transition-colors"
                  >
                    اقتراحات
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashSection>
  );
});

export default RecommendedForYouSection;
