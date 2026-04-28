"use client";

import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatItem {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "cyan" | "orange" | "pink";
  onClick?: () => void;
}

interface EnhancedStatsCardsProps {
  stats: StatItem[];
  layout?: "grid" | "carousel";
  animated?: boolean;
  className?: string;
}

const colorConfig = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 to-transparent",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    gradient: "from-green-500/20 to-transparent",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/20",
    gradient: "from-yellow-500/20 to-transparent",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 to-transparent",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 to-transparent",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/20 to-transparent",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    gradient: "from-orange-500/20 to-transparent",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
    gradient: "from-pink-500/20 to-transparent",
  },
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{formatNumber(displayValue)}</span>;
}

function StatCard({ stat, animated, index }: { stat: StatItem; animated: boolean; index: number }) {
  const config = colorConfig[stat.color || "blue"];
  const Icon = stat.icon;

  return (
    <AdminCard
      variant="gradient"
      interactive={!!stat.onClick}
      onClick={stat.onClick}
      className={cn(
        "relative overflow-hidden group",
        "animate-in fade-in slide-in-from-bottom-4",
        stat.onClick && "cursor-pointer"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Background gradient decoration */}
      <div
        className={cn(
          "absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 transition-transform group-hover:scale-150",
          config.gradient
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <div className="flex items-baseline gap-2">
              {typeof stat.value === "number" && animated ? (
                <AnimatedNumber value={stat.value} className={cn("text-3xl font-bold tracking-tight", config.text)} />
              ) : (
                <p className={cn("text-3xl font-bold tracking-tight", config.text)}>
                  {typeof stat.value === "number" ? formatNumber(stat.value) : stat.value}
                </p>
              )}
            </div>
          </div>

          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                config.bg
              )}
            >
              <Icon className={cn("h-6 w-6", config.text)} />
            </div>
          )}
        </div>

        {/* Trend and description */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {stat.trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                stat.trend.isPositive
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : stat.trend.value === 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {stat.trend.value === 0 ? (
                <Minus className="h-3 w-3" />
              ) : stat.trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(stat.trend.value)}%
            </span>
          )}
          {stat.description && (
            <span className="text-xs text-muted-foreground">{stat.description}</span>
          )}
        </div>
      </div>
    </AdminCard>
  );
}

export function EnhancedStatsCards({
  stats,
  layout = "grid",
  animated = true,
  className,
}: EnhancedStatsCardsProps) {
  if (layout === "carousel") {
    return (
      <div className={cn("relative", className)}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {stats.map((stat, index) => (
            <div key={index} className="snap-start flex-shrink-0 w-[280px]">
              <StatCard stat={stat} animated={animated} index={index} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} animated={animated} index={index} />
      ))}
    </div>
  );
}

// Quick Stats Row - Compact version
interface QuickStatsRowProps {
  stats: Array<{
    label: string;
    value: number | string;
    icon?: React.ElementType;
    color?: keyof typeof colorConfig;
  }>;
  className?: string;
}

export function QuickStatsRow({ stats, className }: QuickStatsRowProps) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {stats.map((stat, index) => {
        const config = colorConfig[stat.color || "blue"];
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2",
              config.bg,
              "animate-in fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {Icon && <Icon className={cn("h-4 w-4", config.text)} />}
            <span className="font-semibold">{typeof stat.value === "number" ? formatNumber(stat.value) : stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Mini Chart Sparkline
interface SparklineProps {
  data: number[];
  color?: keyof typeof colorConfig;
  className?: string;
}

function Sparkline({ data, color = "blue", className }: SparklineProps) {
  const config = colorConfig[color];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className={cn("w-full h-8", className)} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={config.text.includes("blue") ? "#3b82f6" : config.text.includes("green") ? "#22c55e" : "#8b5cf6"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
