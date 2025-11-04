"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Button } from "@/shared/button";
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
import Link from "next/link";

interface Recommendation {
  id: string;
  type: "study_plan" | "task" | "resource" | "tip" | "exam_prep";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: number;
  estimatedTime?: string;
  category: string;
  icon: React.ReactNode;
  actionUrl: string;
}

export const IntelligentRecommendationsSection = memo(function IntelligentRecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/recommendations");
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        } else {
          // Fallback to mock data
          setRecommendations(getMockRecommendations());
        }
      } catch (error) {
        console.warn("Failed to fetch recommendations, using mock data");
        setRecommendations(getMockRecommendations());
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const getMockRecommendations = (): Recommendation[] => [
    {
      id: "1",
      type: "study_plan",
      title: "خطة دراسة مخصصة للرياضيات",
      description: "بناءً على أدائك الأخير، نوصي بتخصيص 45 دقيقة يومياً للرياضيات مع التركيز على الجبر",
      priority: "high",
      impact: 92,
      estimatedTime: "45 دقيقة",
      category: "study_plan",
      icon: <Target className="h-5 w-5" />,
      actionUrl: "/schedule"
    },
    {
      id: "2",
      type: "task",
      title: "مراجعة الفصل الثالث في العلوم",
      description: "حان وقت مراجعة المواد التي درستها قبل 3 أيام لتحسين الاست retention",
      priority: "high",
      impact: 88,
      estimatedTime: "30 دقيقة",
      category: "task",
      icon: <BookOpen className="h-5 w-5" />,
      actionUrl: "/tasks"
    },
    {
      id: "3",
      type: "resource",
      title: "مصادر إضافية للفيزياء",
      description: "اكتشف مجموعة من الفيديوهات والتمارين التفاعلية التي ستساعدك في فهم الميكانيكا",
      priority: "medium",
      impact: 75,
      category: "resource",
      icon: <Lightbulb className="h-5 w-5" />,
      actionUrl: "/resources"
    },
    {
      id: "4",
      type: "exam_prep",
      title: "اختبار تجريبي للغة العربية",
      description: "جاهز لاختبار نفسك؟ لدينا اختبار تجريبي مصمم بناءً على نقاط ضعفك المكتشفة",
      priority: "high",
      impact: 95,
      estimatedTime: "60 دقيقة",
      category: "exam_prep",
      icon: <CheckCircle2 className="h-5 w-5" />,
      actionUrl: "/exams"
    },
    {
      id: "5",
      type: "tip",
      title: "تقنية Pomodoro للتركيز",
      description: "جرب تقنية 25 دقيقة دراسة + 5 دقائق راحة لزيادة إنتاجيتك بنسبة 40%",
      priority: "medium",
      impact: 70,
      category: "tip",
      icon: <Zap className="h-5 w-5" />,
      actionUrl: "/time"
    }
  ];

  const categories = [
    { id: "all", label: "الكل", icon: <Sparkles className="h-4 w-4" /> },
    { id: "study_plan", label: "خطط الدراسة", icon: <Target className="h-4 w-4" /> },
    { id: "task", label: "المهام", icon: <BookOpen className="h-4 w-4" /> },
    { id: "resource", label: "الموارد", icon: <Lightbulb className="h-4 w-4" /> },
    { id: "exam_prep", label: "التحضير للامتحانات", icon: <CheckCircle2 className="h-4 w-4" /> }
  ];

  const filteredRecommendations = selectedCategory === "all" 
    ? recommendations 
    : recommendations.filter(rec => rec.category === selectedCategory);

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
            <AnimatePresence mode="wait">
              {filteredRecommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <Card className="h-full border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 p-2">
                            {recommendation.icon}
                          </div>
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {getPriorityLabel(recommendation.priority)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-purple-600">
                          <TrendingUp className="h-3 w-3" />
                          {recommendation.impact}%
                        </div>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {recommendation.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {recommendation.description}
                      </p>

                      {recommendation.estimatedTime && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span>{recommendation.estimatedTime}</span>
                        </div>
                      )}

                      {/* Impact Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">تأثير متوقع</span>
                          <span className="font-semibold text-purple-600">{recommendation.impact}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${recommendation.impact}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                          />
                        </div>
                      </div>

                      <Link href={recommendation.actionUrl}>
                        <Button className="w-full group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-indigo-600 transition-all">
                          <span>اعرض التفاصيل</span>
                          <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredRecommendations.length === 0 && (
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

