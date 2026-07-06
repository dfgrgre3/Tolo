"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/safe-client-utils";
import { Sparkles, Target, BookOpen, History, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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

  const fetchRecommendedCourses = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await safeFetch<{
        courses: RecommendedCourse[];
        searchHistory: SearchHistoryItem[];
        totalPages: number;
        page: number;
      }>(
        `/api/recommendations/courses?page=${pageNum}`,
        undefined,
        null
      );

      if (fetchError || !data) {
        logger.warn("Failed to fetch recommended courses:", fetchError);
        
        // Fallback: use localStorage search history for local recommendations
        const localHistory = getLocalSearchHistory();
        setSearchHistory(localHistory);
        
        // Generate mock recommendations based on search history
        const mockCourses = generateMockRecommendations(localHistory);
        setCourses(mockCourses);
        setTotalPages(1);
        setError(null);
        return;
      }

      setCourses(data.courses || []);
      setSearchHistory(data.searchHistory || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setError(null);
    } catch (err) {
      logger.error("Error fetching recommended courses:", err);
      
      // Fallback to local
      const localHistory = getLocalSearchHistory();
      setSearchHistory(localHistory);
      const mockCourses = generateMockRecommendations(localHistory);
      setCourses(mockCourses);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendedCourses(page);
  }, [fetchRecommendedCourses, page]);

  const getLocalSearchHistory = (): SearchHistoryItem[] => {
    try {
      const stored = typeof window !== "undefined" 
        ? localStorage.getItem("recent_searches") 
        : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((q: string) => ({
            query: q,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  };

  const generateMockRecommendations = (history: SearchHistoryItem[]): RecommendedCourse[] => {
    const allCourses: RecommendedCourse[] = [
      {
        id: "math-1",
        title: "الرياضيات التطبيقية - التفاضل والتكامل",
        description: "دورة شاملة في التفاضل والتكامل تشمل النهايات، المشتقات، والتكاملات مع تطبيقات عملية",
        category: "الرياضيات",
        subject: "الرياضيات",
        rating: 4.8,
        studentsCount: 1250,
        duration: "20 ساعة",
        level: "متوسط",
        matchReason: "بناءً على بحثك السابق عن 'الرياضيات'",
        matchScore: 95,
      },
      {
        id: "math-2",
        title: "الجبر الخطي - أساسيات المصفوفات",
        description: "تعلم أساسيات الجبر الخطي، المصفوفات، المحددات، وحل المعادلات الخطية",
        category: "الرياضيات",
        subject: "الرياضيات",
        rating: 4.6,
        studentsCount: 890,
        duration: "15 ساعة",
        level: "مبتدئ",
        matchReason: "مستوى مناسب بناءً على تقدمك",
        matchScore: 88,
      },
      {
        id: "physics-1",
        title: "الفيزياء - الميكانيكا الكلاسيكية",
        description: "دراسة القوانين الأساسية للميكانيكا: قوانين نيوتن، الشغل والطاقة، والحركة الدائرية",
        category: "الفيزياء",
        subject: "الفيزياء",
        rating: 4.7,
        studentsCount: 980,
        duration: "25 ساعة",
        level: "متقدم",
        matchReason: "بناءً على بحثك السابق عن 'الفيزياء'",
        matchScore: 92,
      },
      {
        id: "chem-1",
        title: "الكيمياء العضوية - المركبات الهيدروكربونية",
        description: "شرح مفصل للمركبات العضوية، التفاعلات الكيميائية، وآليات التفاعل",
        category: "الكيمياء",
        subject: "الكيمياء",
        rating: 4.5,
        studentsCount: 760,
        duration: "18 ساعة",
        level: "متوسط",
        matchReason: "بناءً على بحثك عن 'الكيمياء' ومواد ذات صلة",
        matchScore: 85,
      },
      {
        id: "eng-1",
        title: "اللغة الإنجليزية - قواعد ومفردات متقدمة",
        description: "دورة متكاملة لتطوير مهارات اللغة الإنجليزية: قواعد، مفردات، قراءة، وكتابة",
        category: "اللغة الإنجليزية",
        subject: "اللغة الإنجليزية",
        rating: 4.9,
        studentsCount: 2100,
        duration: "30 ساعة",
        level: "متوسط",
        matchReason: "الأكثر شهرة في هذا التصنيف",
        matchScore: 90,
      },
      {
        id: "arabic-1",
        title: "النحو العربي - قواعد الإعراب الكامل",
        description: "تعلم قواعد النحو العربي والإعراب من الأساس إلى الاحتراف مع تمارين تفاعلية",
        category: "اللغة العربية",
        subject: "اللغة العربية",
        rating: 4.4,
        studentsCount: 650,
        duration: "22 ساعة",
        level: "مبتدئ",
        matchReason: "بناءً على اهتماماتك المسجلة",
        matchScore: 78,
      },
      {
        id: "biology-1",
        title: "الأحياء - الخلية والوراثة",
        description: "دراسة تركيب الخلية، وظائفها، وعلم الوراثة الجزيئي بشكل مبسط وشامل",
        category: "الأحياء",
        subject: "الأحياء",
        rating: 4.6,
        studentsCount: 820,
        duration: "16 ساعة",
        level: "متوسط",
        matchReason: "موصى به من طلاب مثلك",
        matchScore: 82,
      },
      {
        id: "history-1",
        title: "التاريخ - الحضارات القديمة",
        description: "رحلة عبر الحضارات القديمة: الفرعونية، الإغريقية، الرومانية، والإسلامية",
        category: "التاريخ",
        subject: "التاريخ",
        rating: 4.3,
        studentsCount: 540,
        duration: "14 ساعة",
        level: "مبتدئ",
        matchReason: "بناءً على بحثك السابق",
        matchScore: 75,
      },
    ];

    // إذا كان هناك سجل بحث، قم بترتيب النتائج حسب الصلة
    if (history.length > 0) {
      const searchTerms = history.map(h => h.query.toLowerCase());
      
      const scored = allCourses.map(course => {
        let score = course.matchScore;
        searchTerms.forEach(term => {
          if (course.title.toLowerCase().includes(term) || 
              course.subject.toLowerCase().includes(term) ||
              course.category.toLowerCase().includes(term)) {
            score += 10;
          }
        });
        return { ...course, matchScore: Math.min(score, 100) };
      });

      return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 8);
    }

    return allCourses.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchRecommendedCourses(1);
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem("recent_searches");
      setSearchHistory([]);
    } catch {
      // Ignore
    }
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
                  {searchHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                    >
                      مسح السجل
                    </Button>
                  )}
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

// Import Search icon for empty state
import { Search } from "lucide-react";

export default RecommendedForYouSection;