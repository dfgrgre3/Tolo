"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Progress } from "@/shared/progress";
import { safeFetch } from "@/lib/safe-client-utils";
import { 
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";

interface PerformanceMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
  status: "excellent" | "good" | "warning" | "critical";
}

export const PerformanceDashboardSection = memo(function PerformanceDashboardSection() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await safeFetch<{ metrics: Record<string, { count: number; avg: number; min: number; max: number; trend: 'up' | 'down' | 'stable' }> }>(
          "/api/analytics/performance",
          undefined,
          null
        );

        if (error || !data) {
          setMetrics([]);
          setLoading(false);
          return;
        }

        // Transform API data to PerformanceMetric format
        const transformedMetrics: PerformanceMetric[] = Object.entries(data.metrics || {}).map(([key, value]) => {
          let status: "excellent" | "good" | "warning" | "critical" = "good";
          let unit = "%";
          let target = 100;

          // Determine status and target based on metric type
          if (key.includes("سرعة") || key.includes("سرعة التحميل")) {
            status = value.avg >= 90 ? "excellent" : value.avg >= 70 ? "good" : "warning";
            target = 85;
          } else if (key.includes("وقت") || key.includes("استجابة")) {
            status = value.avg <= 200 ? "excellent" : value.avg <= 500 ? "good" : "warning";
            target = 200;
            unit = "ms";
          } else if (key.includes("خطأ") || key.includes("error")) {
            status = value.avg <= 1 ? "excellent" : value.avg <= 2 ? "good" : "warning";
            target = 2;
          } else if (key.includes("ذاكرة") || key.includes("memory")) {
            status = value.avg <= 70 ? "excellent" : value.avg <= 85 ? "good" : "warning";
            target = 80;
          } else if (key.includes("CPU")) {
            status = value.avg <= 50 ? "excellent" : value.avg <= 70 ? "good" : "warning";
            target = 70;
          }

          return {
            name: key,
            value: Math.round(value.avg),
            target,
            unit,
            trend: value.trend,
            status
          };
        });

        setMetrics(transformedMetrics);
      } catch (error) {
        console.error("Error fetching performance metrics:", error);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-700 border-green-200";
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "warning":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <CheckCircle2 className="h-4 w-4" />;
      case "good":
        return <CheckCircle2 className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const calculateProgress = (value: number, target: number) => {
    return Math.min(100, (value / target) * 100);
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-indigo-200/25" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 p-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">
                لوحة مراقبة الأداء
              </h2>
            </div>
            <p className="text-muted-foreground text-lg">
              رصد مباشر لأداء النظام والمكونات في الوقت الفعلي
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Clock className="h-3 w-3 mr-1" />
            مباشر
          </Badge>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="border-slate-200/80 shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {metric.name}
                    </CardTitle>
                    <Badge className={getStatusColor(metric.status)}>
                      {getStatusIcon(metric.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {metric.value.toFixed(metric.name.includes("معدل") ? 1 : 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">{metric.unit}</span>
                    <div className="ml-auto">
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">الهدف: {metric.target}{metric.unit}</span>
                      <span className="text-muted-foreground">
                        {metric.value < metric.target ? "تحت الهدف" : "فوق الهدف"}
                      </span>
                    </div>
                    <Progress 
                      value={calculateProgress(metric.value, metric.target)} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="h-3 w-3 text-blue-600" />
                    <span className="text-muted-foreground">
                      {metric.value >= metric.target 
                        ? `أفضل من الهدف بـ ${((metric.value / metric.target - 1) * 100).toFixed(0)}%`
                        : `أقل من الهدف بـ ${((1 - metric.value / metric.target) * 100).toFixed(0)}%`
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-slate-200/80 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {metrics.filter(m => m.status === "excellent").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">ممتاز</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {metrics.filter(m => m.status === "good").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">جيد</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {metrics.filter(m => m.status === "warning").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">تحذير</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {metrics.filter(m => m.status === "critical").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">حرج</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

export default PerformanceDashboardSection;

