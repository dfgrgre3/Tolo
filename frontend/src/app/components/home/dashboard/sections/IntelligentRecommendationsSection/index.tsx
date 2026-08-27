"use client";

import { useState, memo } from "react";
import { Sparkles, Target, BookOpen, Lightbulb, CheckCircle2, RefreshCw } from "lucide-react";
import { DashSection, DashEmpty } from "../../shared/SectionShell";
import { DASH_GRID } from "../../shared/design-system";
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
    <DashSection
      title="توصيات مخصصة"
      subtitle="مبنية على مهامك المتأخرة، المواد التي تحتاج تقوية، والكورسات التي توقفت عندها."
      icon={Sparkles}
      toolbar={
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      }
    >
      {loading ? (
        <div className={DASH_GRID.cards3}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-lg bg-muted border border-border animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <DashEmpty
          icon={RefreshCw}
          title="تعذر تحميل التوصيات"
          description={error}
          action={
            <button
              onClick={refetch}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              إعادة المحاولة
            </button>
          }
        />
      ) : filteredRecommendations.length === 0 ? (
        <DashEmpty
          icon={Target}
          title="لا توجد توصيات حالياً"
          description="أنت منتظم في مهامك وكورساتك، استمر"
        />
      ) : (
        <div className={DASH_GRID.cards3}>
          {filteredRecommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              index={index}
            />
          ))}
        </div>
      )}
    </DashSection>
  );
});

export default IntelligentRecommendationsSection;
