"use client";

import { useState, useEffect, memo } from "react";
import { m } from "framer-motion";
import { safeFetch, getSafeUserId } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { TrendingUp } from "lucide-react";
import { rpgCommonStyles } from "../../constants";
import { PredictionCard } from "./PredictionCard";
import { PredictionInfoBanner } from "./PredictionInfoBanner";

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
      const userId = getSafeUserId();

      try {
        const { data, error } = await safeFetch<{predictions: Prediction[];}>(
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
        <m.div
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
        </m.div>

        <div className="grid gap-8 md:grid-cols-2">
          {predictions.map((prediction, index) => (
            <PredictionCard
              key={prediction.period}
              prediction={prediction}
              index={index}
            />
          ))}
        </div>

        <PredictionInfoBanner />
      </div>
    </section>
  );
});

export default ProgressPredictionsSection;
