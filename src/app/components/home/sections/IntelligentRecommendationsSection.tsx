"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/safe-client-utils";
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Target,
  ArrowRight,
  Lightbulb,
  Zap,
  CheckCircle2,
  Loader2
} from "lucide-react";

// Icon mapping for string-based icons from API
const iconMap: Record<string, React.ReactNode> = {
  target: <Target className="h-5 w-5" />,
  "book-open": <BookOpen className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  "check-circle-2": <CheckCircle2 className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />
};
import Link from "next/link";

import { logger } from '@/lib/logger';

interface Recommendation {
  id: string;
  type: "study_plan" | "task" | "resource" | "tip" | "exam_prep";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: number;
  estimatedTime?: string;
  category: string;
  icon: string | React.ReactNode;
  actionUrl: string;
}

export const IntelligentRecommendationsSection = memo(function IntelligentRecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await safeFetch<{ recommendations: Recommendation[] }>(
          "/api/recommendations",
          undefined,
          null
        );

        if (fetchError || !data) {
          logger.warn("Failed to fetch recommendations:", fetchError);
          setRecommendations([]);
          setError("فشل تحميل التوصيات");
          return;
        }

        setRecommendations(data.recommendations || []);
        setError(null);
      } catch (err) {
        logger.error("Error fetching recommendations:", err);
        setRecommendations([]);
        setError("حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);


  const categories = [
    { id: "all", label: "الكل", icon: <Sparkles className="h-4 w-4" /> },
    { id: "study_plan", label: "خطط الدراسة", icon: <Target className="h-4 w-4" /> },
    { id: "task", label: "المهام", icon: <BookOpen className="h-4 w-4" /> },
    { id: "resource", label: "الموارد", icon: <Lightbulb className="h-4 w-4" /> },
    { id: "exam_prep", label: "التحضير للامتحانات", icon: <CheckCircle2 className="h-4 w-4" /> }
  ];

  const filteredRecommendations = selectedCategory === "all" 
    ? recommendations 
    : recommendations.filter(rec => rec.type === selectedCategory || rec.category === selectedCategory);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "عالي الأولوية";
      case "medium":
        return "متوسط الأولوية";
      default:
        return "منخفض الأولوية";
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200/25 via-transparent to-indigo-200/25" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              توصيات ذكية مخصصة
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            توصيات مدعومة بالذكاء الاصطناعي مصممة خصيصاً لك بناءً على أدائك وتفضيلاتك
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-lg"
                  : "bg-white/80 text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              {category.icon}
              <span className="font-medium">{category.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Recommendations Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredRecommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <Card className="h-full border-slate-200/80 shadow-lg transition-all duration-300 overflow-hidden group relative hover:shadow-[0_0_25px_rgba(124,58,237,0.25)] hover:border-purple-500/40 dark:bg-slate-900/40 dark:border-slate-700">
                    {/* Glowing Effect Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <CardHeader className="pb-3 relative z-10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 p-2 ring-1 ring-purple-500/10">
                            {typeof recommendation.icon === 'string' 
                              ? (iconMap[recommendation.icon] || <Sparkles className="h-5 w-5 text-purple-600" />)
                              : recommendation.icon}
                          </div>
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {getPriorityLabel(recommendation.priority)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                          <Zap className="h-3 w-3 fill-current" />
                          {recommendation.impact}%
                        </div>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {recommendation.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {recommendation.description}
                      </p>

                      {recommendation.estimatedTime && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{recommendation.estimatedTime}</span>
                        </div>
                      )}

                      {/* Impact Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">التأثير المتوقع على مستواك</span>
                          <span className="text-purple-600">{recommendation.impact}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${recommendation.impact}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                          />
                        </div>
                      </div>

                      <Link href={recommendation.actionUrl} className="block mt-4">
                        <Button className="w-full bg-slate-900 hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 dark:bg-slate-800 text-white transition-all duration-300 shadow-md group-hover:shadow-lg">
                          <span>تنفيذ التوصية</span>
                          <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!loading && !error && filteredRecommendations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">لا توجد توصيات متاحة حالياً</p>
          </motion.div>
        )}
      </div>
    </section>
  );
});

export default IntelligentRecommendationsSection;

