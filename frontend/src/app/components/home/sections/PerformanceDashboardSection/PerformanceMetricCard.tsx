"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PerformanceMetric, MetricStatus } from "../../types";

interface PerformanceMetricCardProps {
  metric: PerformanceMetric;
  index: number;
}

export const PerformanceMetricCard = ({ metric, index }: PerformanceMetricCardProps) => {
  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case "excellent":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "good":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
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
    <m.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card className="border-white/5 bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-primary/10 hover:border-primary/20 transition-all duration-300 h-full overflow-hidden">
        <CardHeader className="p-4 pb-2 relative">
          <div className="flex items-start justify-between mb-1">
            <CardTitle className="text-sm font-bold text-gray-300 flex items-center gap-2 truncate pr-2 w-full">
              <span className="shrink-0 text-primary/80">{metric.icon}</span>
              <span className="truncate" title={metric.rpgName}>{metric.rpgName}</span>
            </CardTitle>
            <div className={`shrink-0 rounded-full p-1 border ${getStatusColor(metric.status)}`}>
              {getStatusIcon(metric.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white drop-shadow-sm tabular-nums tracking-tight">
              {metric.value}
            </span>
            <span className="text-xs text-gray-500 font-mono self-end mb-1">{metric.unit}</span>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500">
              <span>الهدف: {metric.target}</span>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="h-3 w-3 text-rose-400" />
              ) : (
                <Activity className="h-3 w-3 text-blue-400" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Progress
              value={metric.target > 0 ? Math.min((metric.value / metric.target) * 100, 100) : 0}
              className="h-1.5 bg-white/5"
              indicatorClassName={
                metric.status === 'excellent' 
                  ? 'bg-emerald-500 shadow-[0_0_8px_currentColor]' 
                  : metric.status === 'good' 
                    ? 'bg-blue-500' 
                    : 'bg-yellow-500'
              }
            />
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default PerformanceMetricCard;
