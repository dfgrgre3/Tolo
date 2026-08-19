"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, BookOpen, Lightbulb, CheckCircle2, Loader2 } from "lucide-react";
import { rpgCommonStyles } from "../../shared/styles";
import { useRecommendations } from "../../hooks/useDashboardData";
import { CategoryFilter } from "./CategoryFilter";
import { RecommendationCard } from "./RecommendationCard";

/** Filter tabs mirror the `type` values the backend emits. */
const CATEGORIES = [
  { id: "all", label: "الكل", icon: <Sparkles className="h-4 w-4" /> },
  { id: "study_plan", label: "خطط الدراسة", icon: <Target className="h-4 w-4" /> },
  { id: "task", label: "المهام", icon: <BookOpen className="h-4 w-4" /> },
  { id: "tip", label: "نصائح", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "exam_prep", label: "التحضير للامتحانات", icon: <CheckCircle2 className="h-4 w-4" /> }
];

export const IntelligentRecommendationsSection = memo(function IntelligentRecommendationsSection() {
  const { recommendations, loading, error, refetch } = useRecommendations();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredRecommendations = selectedCategory === "all"
    ? recommendations
    : recommendations.filter(rec => rec.type === selectedCategory || rec.category === selectedCategory);

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <div
          className="mb-10 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-purple-500/20 p-4 ring-1 ring-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
            <h2 className={`text-3xl md:text-5xl font-black ${rpgCommonStyles.neonText}`}>
              توصيات مخصصة
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            مبنية على مهامك المتأخرة، المواد التي تحتاج تقوية، والكورسات التي توقفت عندها.
          </p>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {/* Recommendations Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 font-bold mb-6 text-xl">{error}</p>
            <Button onClick={refetch} variant="outline" className="border-white/10 hover:bg-white/10 text-gray-300 rounded-xl px-8">
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            
              {filteredRecommendations.length > 0 ? (
                filteredRecommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    index={index}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-20 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Target className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-500 mb-2">لا توجد توصيات حالياً</p>
                  <p className="text-sm text-gray-600">أنت منتظم في مهامك وكورساتك، استمر</p>
                </div>
              )}
            
          </div>
        )}
      </div>
    </section>
  );
});

export default IntelligentRecommendationsSection;
