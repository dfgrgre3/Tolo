"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Brain, CalendarCheck, Timer, ListChecks, GraduationCap } from "lucide-react";
import { PerformanceMetric, MetricStatus } from "../../shared/types";

interface PerformanceMetricCardProps {
  metric: PerformanceMetric;
  index: number;
}

/** Maps each metric emitted by the backend to its icon. */
const METRIC_ICONS: Record<string, React.ReactNode> = {
  focus: <Brain className="h-4 w-4" />,
  consistency: <CalendarCheck className="h-4 w-4" />,
  studyVolume: <Timer className="h-4 w-4" />,
  taskCompletion: <ListChecks className="h-4 w-4" />,
  examScore: <GraduationCap className="h-4 w-4" />,
};

export const PerformanceMetricCard = ({ metric, index: _index }: PerformanceMetricCardProps) => {
  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case "excellent":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "good":
        return "bg-primary/10 text-primary-strong border-primary/20";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "critical":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case "excellent":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "good":
        return <Activity className="h-3.5 w-3.5" />;
      case "warning":
      case "critical":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  return (
    <div
    >
      <Card className="border-border bg-card shadow-sm hover:border-primary/20 h-full overflow-hidden">
        <CardHeader className="p-4 pb-2 relative">
          <div className="flex items-start justify-between mb-1">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2 truncate pr-2 w-full">
              <span className="shrink-0 text-primary-strong">{METRIC_ICONS[metric.name] ?? <Activity className="h-4 w-4" />}</span>
              <span className="truncate" title={metric.rpgName}>{metric.rpgName}</span>
            </CardTitle>
            <div className={`shrink-0 rounded-full p-1 border ${getStatusColor(metric.status)}`}>
              {getStatusIcon(metric.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {metric.value}
            </span>
            <span className="text-xs text-muted-foreground font-mono self-end mb-1">{metric.unit}</span>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>الهدف: {metric.target}</span>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <Activity className="h-3 w-3 text-primary-strong" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Progress
              value={metric.target > 0 ? Math.min((metric.value / metric.target) * 100, 100) : 0}
              className="h-1.5 bg-muted"
              indicatorClassName={
                metric.status === 'excellent'
                  ? 'bg-emerald-500'
                  : metric.status === 'good'
                    ? 'bg-primary'
                    : 'bg-amber-500'
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetricCard;
