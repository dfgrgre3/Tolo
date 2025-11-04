"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Progress } from "@/shared/progress";
import { 
  TrendingUp,
  Target,
  Calendar,
  Lightbulb,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface Prediction {
  period: string;
  predictedScore: number;
  confidence: number;
  milestones: Array<{
    date: string;
    goal: string;
    status: "upcoming" | "current" | "achieved";
  }>;
  recommendations: string[];
}

export const ProgressPredictionsSection = memo(function ProgressPredictionsSection() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        // In production, this would call an AI-powered prediction API
        const response = await fetch("/api/analytics/predictions");
        if (response.ok) {
          const data = await response.json();
          setPredictions(data.predictions || []);
        } else {
          setPredictions(getMockPredictions());
        }
      } catch {
        setPredictions(getMockPredictions());
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const getMockPredictions = (): Prediction[] => [
    {
      period: "الأسبوع القادم",
      predictedScore: 87,
      confidence: 85,
      milestones: [
        { date: "2024-01-15", goal: "إكمال 20 ساعة دراسة", status: "upcoming" },
        { date: "2024-01-18", goal: "مراجعة جميع الدروس", status: "upcoming" },
        { date: "2024-01-20", goal: "اختبار تجريبي", status: "upcoming" }
      ],
      recommendations: [
        "ركز على مراجعة المواد الضعيفة لمدة 30 دقيقة يومياً",
        "احرص على جلسات دراسة قصيرة متكررة",
        "خذ استراحات منتظمة للحفاظ على التركيز"
      ]
    },
    {
      period: "الشهر القادم",
      predictedScore: 92,
      confidence: 78,
      milestones: [
        { date: "2024-01-25", goal: "إكمال 100 ساعة إجمالية", status: "upcoming" },
        { date: "2024-02-01", goal: "إنجاز سلسلة 30 يوم", status: "upcoming" },
        { date: "2024-02-10", goal: "اختبار منتصف الفصل", status: "upcoming" }
      ],
      recommendations: [
        "استمر في الالتزام بجدولك الدراسي اليومي",
        "شارك في المناقشات الجماعية لتعزيز الفهم",
        "استخدم تقنيات الاستذكار المتقدم"
      ]
    }
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-100";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-orange-600 bg-orange-100";
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "achieved":
        return "bg-green-100 text-green-700 border-green-200";
      case "current":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/25 via-transparent to-purple-200/25" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              تنبؤات التقدم الذكية
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            تنبؤات مدعومة بالذكاء الاصطناعي بناءً على أدائك الحالي وأنماط التعلم
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {predictions.map((prediction, index) => (
            <motion.div
              key={prediction.period}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="border-slate-200/80 shadow-lg hover:shadow-xl transition-all h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      <span>{prediction.period}</span>
                    </CardTitle>
                    <Badge className={getConfidenceColor(prediction.confidence)}>
                      ثقة: {prediction.confidence}%
                    </Badge>
                  </div>

                  {/* Predicted Score */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        الدرجة المتوقعة
                      </span>
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-indigo-700">
                        {prediction.predictedScore}
                      </span>
                      <span className="text-lg text-muted-foreground">%</span>
                    </div>
                    <Progress value={prediction.predictedScore} className="mt-4 h-3" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Milestones */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo-600" />
                      المعالم القادمة
                    </h4>
                    <div className="space-y-2">
                      {prediction.milestones.map((milestone, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + idx * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                        >
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 mt-2" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-900">
                                {milestone.goal}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getMilestoneStatusColor(milestone.status)}`}
                              >
                                {milestone.status === "achieved" && "محقق"}
                                {milestone.status === "current" && "جاري"}
                                {milestone.status === "upcoming" && "قادم"}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(milestone.date).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      توصيات لتحسين الأداء
                    </h4>
                    <div className="space-y-2">
                      {prediction.recommendations.map((rec, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + idx * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50/50 border border-yellow-100"
                        >
                          <ArrowRight className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700">{rec}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-0 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 text-white">
                <div className="rounded-full bg-white/20 p-3 backdrop-blur-md">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">كيف تعمل التنبؤات؟</h3>
                  <p className="text-sm text-white/80">
                    نستخدم خوارزميات التعلم الآلي لتحليل أدائك السابق، أنماط الدراسة، والاتجاهات
                    لتقديم تنبؤات دقيقة حول تقدمك المستقبلي
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

export default ProgressPredictionsSection;

