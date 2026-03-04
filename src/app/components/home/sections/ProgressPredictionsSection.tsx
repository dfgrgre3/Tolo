"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { safeFetch } from "@/lib/safe-client-utils";
import { getSafeUserId } from "@/lib/safe-client-utils";
import { logger } from '@/lib/logger';

import { 
  TrendingUp,
  Target,
  Calendar,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Clock
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

import { rpgCommonStyles } from "../constants";

export const ProgressPredictionsSection = memo(function ProgressPredictionsSection() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      const userId = getSafeUserId();
      
      try {
        const { data, error } = await safeFetch<{ predictions: Prediction[] }>(
          `/api/analytics/predictions${userId ? `?userId=${userId}` : ''}`,
          undefined,
          null
        );

        if (error || !data) {
          logger.warn("Failed to fetch predictions:", error);
          setPredictions([]);
          setLoading(false);
          return;
        }

        setPredictions(data.predictions || []);
      } catch (error) {
        logger.error("Error fetching predictions:", error);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return { label: "دقة فائقة", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    if (confidence >= 60) return { label: "دقة عالية", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    return { label: "توقع أولي", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
  };

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case "achieved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "current":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-white/5 text-gray-500 border-white/10";
    }
  };

  if (loading) {
    return (
      <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 flex justify-center items-center`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
      </section>
    );
  }

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-indigo-500/20 p-4 ring-1 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <TrendingUp className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
            <h2 className={`text-3xl md:text-5xl font-black ${rpgCommonStyles.neonText}`}>
              رؤى المستقبل (Prediction Engine)
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            محرك ذكاء اصطناعي يحلل مسارك القتالي ليتنبأ بمستوى نمو مهاراتك القادم.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {predictions.map((prediction, index) => {
            const conf = getConfidenceLevel(prediction.confidence);
            return (
              <motion.div
                key={prediction.period}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="bg-white/5 border-white/5 shadow-xl hover:bg-white/[0.08] transition-all duration-500 border-none group">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-100 group-hover:text-primary transition-colors">
                        <Calendar className="h-6 w-6 text-indigo-400" />
                        <span>{prediction.period}</span>
                      </CardTitle>
                      <Badge className={`${conf.color} text-[10px] uppercase font-black tracking-widest`}>
                        {conf.label}
                      </Badge>
                    </div>

                    <div className="bg-black/40 rounded-3xl p-8 border border-white/5 shadow-inner relative overflow-hidden group/box">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                      <div className="relative z-10 flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          الدرجة القتالية المتوقعة
                        </span>
                        <Target className="h-5 w-5 text-primary animate-bounce-slow" />
                      </div>
                      <div className="relative z-10 flex items-baseline gap-3">
                        <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                          {prediction.predictedScore}
                        </span>
                        <span className="text-xl font-bold text-gray-500">%</span>
                      </div>
                      <div className="mt-8 h-3 bg-black/60 rounded-full overflow-hidden ring-1 ring-white/5 p-[1px]">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${prediction.predictedScore}%` }}
                           transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
                           className="h-full bg-gradient-to-r from-primary via-indigo-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                         />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8 pt-4 space-y-8">
                    <div>
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                        خريطة الأهداف (Roadmap)
                      </h4>
                      <div className="space-y-3">
                        {prediction.milestones.map((milestone, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-200">
                                  {milestone.goal}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] uppercase font-black px-2 py-0.5 border ${getMilestoneStatusBadge(milestone.status)}`}
                                >
                                  {milestone.status === "achieved" && "مكتمل"}
                                  {milestone.status === "current" && "قيد المواجهة"}
                                  {milestone.status === "upcoming" && "هدف مستقبلي"}
                                </Badge>
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {milestone.date}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-amber-400/80 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                        تكتيكات مقترحة (Tactics)
                      </h4>
                      <div className="grid gap-3">
                        {prediction.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
                          >
                            <ArrowRight className="h-4 w-4 text-amber-500/70 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-medium text-gray-300 leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-primary/10 via-indigo-600/20 to-primary/10 border border-white/10 backdrop-blur-xl">
             <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                <div className="rounded-2xl bg-white/10 p-4 border border-white/20 shadow-xl backdrop-blur-md">
                   <Lightbulb className="h-8 w-8 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1">
                   <h3 className="text-xl font-black text-white mb-2 tracking-tight">كيف يعمل محرك التنبؤ؟</h3>
                   <p className="text-gray-400 text-sm leading-relaxed max-w-4xl">
                     نقوم بتحليل سجل تدريبك (دراستك)، وكثافة جلساتك، ونتائج معاركك (اختباراتك) عبر خوارزميات التعلم الآلي
                     لنمنحك توقعات دقيقة تساعدك في رسم خطتك المستقبلية للسيطرة على موادك الدراسية.
                   </p>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

export default ProgressPredictionsSection;

