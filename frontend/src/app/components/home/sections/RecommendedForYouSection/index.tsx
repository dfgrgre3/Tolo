"use client";

import { useState, useEffect, memo, useCallback, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/safe-client-utils";
import { Sparkles, Target, BookOpen, History, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { logger } from "@/lib/logger";
import { rpgCommonStyles } from "../../constants";
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

      // Transform backend data to frontend format
      const transformedCourses = (data.recommendations || []).map((rec: any) => ({
        id: rec.id,
        title: rec.title,
        description: rec.description || rec.desc || "",
        category: rec.category || "عام",
        subject: rec.subject || rec.title,
        rating: rec.rating || 4.5,
        studentsCount: rec.studentsCount || 0,
        duration: rec.duration || "غير محدد",
        level: rec.level || "متوسط",
        image: rec.image,
        matchReason: rec.matchReason || "موصى به لك",
        matchScore: rec.matchScore || 80,
      }));

      setCourses(transformedCourses);
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
  }, [page]);

  const handleRefresh = () => {
    setPage(1);
    fetchRecommendedCourses(1);
  };

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-emerald-500/20 p-4 ring-1 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-8 w-8 text-emerald-400 animate-pulse" />
            </div>
            <h2 className={`text-3xl md:text-5xl font-black ${rpgCommonStyles.neonText}`}>
              موصى به لك
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            دورات مختارة خصيصاً لك بناءً على سجل بحثك واهتماماتك الدراسية
          </p>
        </m.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant={activeTab === "recommended" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("recommended")}
            className={`rounded-xl px-6 ${
              activeTab === "recommended"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "border-white/10 text-gray-300 hover:bg-white/10"
            }`}
          >
            <Sparkles className="h-4 w-4 ml-2" />
            الدورات الموصى بها
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-6 ${
              activeTab === "history"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "border-white/10 text-gray-300 hover:bg-white/10"
            }`}
          >
            <History className="h-4 w-4 ml-2" />
            سجل البحث
          </Button>
        </div>

        {/* Refresh button */}
        {activeTab === "recommended" && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="text-gray-400 hover:text-white hover:bg-white/5 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "recommended" ? (
            <m.div
              key="recommended"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : error && courses.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Target className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-500 mb-2">تعذر تحميل التوصيات</p>
                  <p className="text-sm text-gray-600 mb-6">حاول مرة أخرى لاحقاً</p>
                  <Button onClick={handleRefresh} variant="outline" className="border-white/10 hover:bg-white/10 text-gray-300 rounded-xl px-8">
                    إعادة المحاولة
                  </Button>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Search className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-500 mb-2">لا توجد توصيات حتى الآن</p>
                  <p className="text-sm text-gray-600">ابحث عن دورات لنقدم لك توصيات مخصصة</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence>
                      {courses.map((course, index) => (
                        <RecommendedCourseCard
                          key={course.id}
                          course={course}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="border-white/10 text-gray-300 hover:bg-white/10 rounded-xl"
                      >
                        <ChevronRight className="h-4 w-4 ml-1" />
                        السابق
                      </Button>
                      <span className="text-sm text-gray-500">
                        صفحة {page} من {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="border-white/10 text-gray-300 hover:bg-white/10 rounded-xl"
                      >
                        التالي
                        <ChevronLeft className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </m.div>
          ) : (
            <m.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">
                    سجل البحث الخاص بك
                  </h3>
                </div>

                {searchHistory.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-bold">لا يوجد سجل بحث</p>
                    <p className="text-sm text-gray-600 mt-2">ابحث عن دورات لتظهر هنا</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHistory.map((item, index) => (
                      <m.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="rounded-lg bg-purple-500/20 p-2.5">
                          <History className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.query}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary-foreground hover:bg-primary/20 rounded-xl"
                          onClick={() => {
                            setActiveTab("recommended");
                          }}
                        >
                          <BookOpen className="h-4 w-4 ml-1" />
                          اقتراحات
                        </Button>
                      </m.div>
                    ))}
                  </div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});

export default RecommendedForYouSection;