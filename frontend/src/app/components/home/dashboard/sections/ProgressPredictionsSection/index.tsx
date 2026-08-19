"use client";

import { memo } from "react";
import { TrendingUp } from "lucide-react";
import { rpgCommonStyles } from "../../shared/styles";
import { usePredictions } from "../../hooks/useDashboardData";
import { PredictionCard } from "./PredictionCard";
import { PredictionInfoBanner } from "./PredictionInfoBanner";

export const ProgressPredictionsSection = memo(function ProgressPredictionsSection() {
  const { predictions, loading, error } = usePredictions();

  if (loading) {
    return (
      <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 flex justify-center items-center`}>
        <div className=" rounded-full h-10 w-10 border-b-2 border-primary shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
      </section>
    );
  }

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10">
        <div
          className="mb-12 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-indigo-500/20 p-4 ring-1 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <TrendingUp className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className={`text-3xl md:text-5xl font-black ${rpgCommonStyles.neonText}`}>
              توقعات تقدمك
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            محسوبة بانحدار خطي على درجات امتحاناتك خلال آخر 90 يوماً.
          </p>
        </div>

        {error ? (
          <p className="text-center text-red-400 font-bold py-10">{error}</p>
        ) : predictions.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <TrendingUp className="h-10 w-10 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-500 mb-2">لا توجد بيانات كافية للتوقع</p>
            <p className="text-sm text-gray-600">
              أدِّ 3 امتحانات على الأقل ليتمكن النظام من رسم منحنى تقدمك
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
});

export default ProgressPredictionsSection;
