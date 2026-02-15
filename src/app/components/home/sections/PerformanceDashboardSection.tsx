"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { rpgCommonStyles } from "../constants";
import { 
  Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle2, Clock, Swords, Brain, Shield, Gauge 
} from "lucide-react";
import { PerformanceMetric, MetricStatus } from "../types";

export interface DashboardProps {
  metrics?: PerformanceMetric[];
  loading?: boolean;
}

export const PerformanceDashboardSection = ({ metrics = [], loading = false }: DashboardProps) => {
  
  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case "excellent": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "good": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "warning": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case "excellent": return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "good": return <Activity className="h-3.5 w-3.5" />;
      case "warning":
      case "critical": return <AlertTriangle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

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
            <motion.div
              key={metric.name}
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
                      {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : 
                       metric.trend === 'down' ? <TrendingDown className="h-3 w-3 text-rose-400" /> : 
                       <Activity className="h-3 w-3 text-blue-400" />}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Progress 
                      value={Math.min((metric.value / metric.target) * 100, 100)} 
                      className="h-1.5 bg-white/5" 
                      indicatorClassName={metric.status === 'excellent' ? 'bg-emerald-500 shadow-[0_0_8px_currentColor]' : metric.status === 'good' ? 'bg-blue-500' : 'bg-yellow-500'}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PerformanceDashboardSection;
