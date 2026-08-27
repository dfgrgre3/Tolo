"use client";

import { Activity } from "lucide-react";
import { rpgCommonStyles } from "../../shared/styles";
import { usePerformanceMetrics } from "../../hooks/useDashboardData";
import { PerformanceMetricCard } from "./PerformanceMetricCard";

/**
 * Renders the learner's measured performance metrics. Metrics without any
 * underlying activity are labelled as such instead of being shown as zeros.
 */
export const PerformanceDashboardSection = () => {
  const { metrics, loading, error } = usePerformanceMetrics();

  if (loading) {
    return (
      <section className={`${rpgCommonStyles.card} px-6 py-12 flex items-center justify-center min-h-[260px]`}>
        <div className="rounded-full h-8 w-8 border-b-2 border-primary animate-spin" />
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${rpgCommonStyles.card} px-6 py-12 text-center min-h-[260px] flex items-center justify-center`}>
        <p className="text-red-500 font-bold">{error}</p>
      </section>
    );
  }

  if (metrics.length === 0) return null;

  const measuredCount = metrics.filter((metric) => metric.hasData).length;

  return (
    <section className={`${rpgCommonStyles.card} px-6 md:px-10 py-8`}>
      <div className="relative z-10">
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <div className="rounded-xl bg-primary/10 p-2">
                <Activity className="h-6 w-6 text-primary-strong" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                مؤشرات الأداء
              </h2>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {measuredCount > 0
                ? `محسوبة من نشاطك خلال آخر 7 أيام مقارنة بالأسبوع السابق`
                : "لا يوجد نشاط مسجل خلال آخر 7 أيام"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric, index) => (
            <PerformanceMetricCard key={metric.name} metric={metric} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PerformanceDashboardSection;
