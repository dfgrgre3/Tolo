"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from "lucide-react";

interface ComparisonDataItem {
  name: string;
  current: number;
  previous: number;
}

interface TimeComparisonChartProps {
  data: ComparisonDataItem[];
  title?: string;
  currentLabel?: string;
  previousLabel?: string;
  className?: string;
  height?: number;
  showDifference?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.dataKey === "current" ? "الفترة الحالية" : "الفترة السابقة"}:{" "}
            {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function TimeComparisonChart({
  data,
  title = "مقارنة الفترات",
  currentLabel = "الفترة الحالية",
  previousLabel = "الفترة السابقة",
  className,
  height = 300,
  showDifference = true,
}: TimeComparisonChartProps) {
  // Calculate totals and difference
  const totals = React.useMemo(() => {
    const currentTotal = data.reduce((sum, item) => sum + item.current, 0);
    const previousTotal = data.reduce((sum, item) => sum + item.previous, 0);
    const difference = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;
    
    return { currentTotal, previousTotal, difference };
  }, [data]);

  const dataWithDifference = data.map((item) => ({
    ...item,
    difference: item.previous > 0 
      ? ((item.current - item.previous) / item.previous) * 100 
      : 0,
  }));

  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            {title}
          </h3>
        </div>
        
        {showDifference && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{currentLabel}</p>
              <p className="font-semibold text-primary">
                {totals.currentTotal.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{previousLabel}</p>
              <p className="font-semibold text-muted-foreground">
                {totals.previousTotal.toLocaleString()}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                totals.difference > 0
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : totals.difference < 0
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {totals.difference === 0 ? (
                <Minus className="h-4 w-4" />
              ) : totals.difference > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {Math.abs(totals.difference).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataWithDifference}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis
              dataKey="name"
              className="text-xs"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-sm text-foreground">
                  {value === "current" ? currentLabel : previousLabel}
                </span>
              )}
            />
            <Bar
              dataKey="previous"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
            <Bar
              dataKey="current"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
}

// Mini comparison component for inline use
interface ComparisonMiniProps {
  current: number;
  previous: number;
  label?: string;
  className?: string;
}

export function ComparisonMini({ current, previous, label, className }: ComparisonMiniProps) {
  const difference = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{current.toLocaleString()}</p>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          difference > 0
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : difference < 0
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {difference === 0 ? (
          <Minus className="h-3 w-3" />
        ) : difference > 0 ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {Math.abs(difference).toFixed(1)}%
      </div>
    </div>
  );
}
