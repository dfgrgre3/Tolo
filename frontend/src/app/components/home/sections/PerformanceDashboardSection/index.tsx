"use client";

import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";
import { rpgCommonStyles } from "../../constants";
import { PerformanceMetric } from "../../types";
import { PerformanceMetricCard } from "./PerformanceMetricCard";

export interface DashboardProps {
  metrics?: PerformanceMetric[];
  loading?: boolean;
}

export const PerformanceDashboardSection = ({ metrics = [], loading = false }: DashboardProps) => {
  if (loading) {
    return (
      <section className={`${rpgCommonStyles.glassPanel} px-6 py-12 flex justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </section>
    );
  }

  if (!metrics || metrics.length === 0) return null;

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-10 py-8 !bg-black/20`}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <div className="rounded-xl bg-primary/20 p-2 ring-1 ring-primary/40 backdrop-blur-md shadow-lg shadow-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h2 className={`text-2xl md:text-3xl font-bold ${rpgCommonStyles.neonText}`}>
                إحصائيات النظام (System Stats)
              </h2>
            </div>
            <p className="text-muted-foreground text-sm md:text-base hidden md:block">
              مراقبة مؤشراتك الحيوية وقدراتك الذهنية في الوقت الفعلي
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 px-3 py-1 gap-1.5 backdrop-blur-sm self-center md:self-start">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>Active Scan</span>
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric, index) => (
            <PerformanceMetricCard
              key={metric.name}
              metric={metric}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PerformanceDashboardSection;
