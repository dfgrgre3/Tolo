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
      <section className={`${rpgCommonStyles.card} px-6 md:px-12 py-12 flex justify-center items-center`}>
        <div className=" rounded-full h-10 w-10 border-b-2 border-primary" />
      </section>
    );
  }

  return (
    <section className={`${rpgCommonStyles.card} px-6 md:px-12 py-12 overflow-hidden`}>
      <div className="relative z-10">
        <div
          className="mb-12 text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="rounded-full bg-primary/10 p-4">
              <TrendingUp className="h-8 w-8 text-primary-strong" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground">
              توقعات تقدمك
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            محسوبة بانحدار خطي على درجات امتحاناتك خلال آخر 90 يوماً.
          </p>
        </div>

        {error ? (
          <p className="text-center text-red-500 font-bold py-10">{error}</p>
        ) : predictions.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <TrendingUp className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-muted-foreground mb-2">لا توجد بيانات كافية للتوقع</p>
            <p className="text-sm text-muted-foreground">
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
