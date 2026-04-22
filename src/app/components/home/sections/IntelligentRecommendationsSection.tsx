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

import { rpgCommonStyles } from "../constants";

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
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "أولوية قصوى";
      case "medium":
        return "أولوية متوسطة";
      default:
        return "أولوية عادية";
    }
  };

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-purple-500/20 p-4 ring-1 ring-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Sparkles className="h-8 w-8 text-purple-400 animate-pulse" />
            </div>
            <h2 className={`text-3xl md:text-5xl font-black ${rpgCommonStyles.neonText}`}>
              التوصيات الذكية (AI Oracle)
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            توصيات مدعومة بالذكاء الاصطناعي مصممة خصيصاً لك بناءً على أدائك القتالي وتطورك المعرفي.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-300 ${
                selectedCategory === category.id
                  ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-105"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-primary/50 hover:bg-white/10"
              }`}
            >
              {category.icon}
              <span className="font-bold text-sm tracking-wide">{category.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Recommendations Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredRecommendations.length > 0 ? filteredRecommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Card className="h-full bg-white/5 border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden group relative shadow-xl hover:bg-white/[0.08]">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <CardHeader className="pb-4 relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10 shadow-inner group-hover:scale-110 transition-transform">
                            {typeof recommendation.icon === 'string' 
                              ? (iconMap[recommendation.icon] || <Sparkles className="h-5 w-5 text-primary" />)
                              : recommendation.icon}
                          </div>
                          <Badge className={`${getPriorityColor(recommendation.priority)} text-[10px] uppercase font-black tracking-widest`}>
                            {getPriorityLabel(recommendation.priority)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                          <Zap className="h-3 w-3 fill-current" />
                          <span>+{recommendation.impact}% XP</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-primary transition-colors leading-tight">
                        {recommendation.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                        {recommendation.description}
                      </p>

                      <div className="flex flex-wrap gap-4">
                        {recommendation.estimatedTime && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                            <Clock className="h-3 w-3" />
                            <span>{recommendation.estimatedTime}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                          <Target className="h-3 w-3" />
                          <span>تأثير عالي</span>
                        </div>
                      </div>

                      {/* Impact Bar */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          <span>قوة التأثير (Impact Power)</span>
                          <span className="text-primary">{recommendation.impact}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden ring-1 ring-white/5 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${recommendation.impact}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-primary via-purple-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                          />
                        </div>
                      </div>

                      <Link href={recommendation.actionUrl} className="block mt-2">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
                          <span>بدء التنفيذ</span>
                          <ArrowRight className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )) : (
                <div className="col-span-full text-center py-20 flex flex-col items-center">
                   <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                     <Target className="h-10 w-10 text-gray-600" />
                   </div>
                   <p className="text-xl font-bold text-gray-500 mb-2">لا توجد توصيات حالياً</p>
                   <p className="text-sm text-gray-600">استمر في إتمام المهام لنتمكن من تحليل أدائك</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-400 font-bold mb-6 text-xl">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-white/10 hover:bg-white/10 text-gray-300 rounded-xl px-8">
              إعادة محاولة الاتصال
            </Button>
          </div>
        )}
      </div>
    </section>
  );
});

export default IntelligentRecommendationsSection;

