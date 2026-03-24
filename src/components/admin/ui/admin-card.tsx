"use client";

import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const cardVariants = cva(
  "rounded-xl border bg-card transition-all duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-lg hover:-translate-y-0.5",
        gradient: "bg-gradient-to-br from-card to-muted/50 hover:shadow-xl",
        glass: "bg-card/50 backdrop-blur-xl border-white/10",
        outline: "bg-transparent hover:bg-muted/50",
        flat: "border-0 bg-muted/30 hover:bg-muted/50",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface AdminCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean;
}

export function AdminCard({
  className,
  variant,
  size,
  interactive = false,
  children,
  ...props
}: AdminCardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, size }),
        interactive && "cursor-pointer hover:border-primary/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Stats Card with trend
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: "default" | "blue" | "green" | "yellow" | "red" | "purple";
  className?: string;
}

const colorClasses = {
  default: "text-primary",
  blue: "text-blue-500",
  green: "text-green-500",
  yellow: "text-yellow-500",
  red: "text-red-500",
  purple: "text-purple-500",
};

const iconBgClasses = {
  default: "bg-primary/10",
  blue: "bg-blue-500/10",
  green: "bg-green-500/10",
  yellow: "bg-yellow-500/10",
  red: "bg-red-500/10",
  purple: "bg-purple-500/10",
};

export function AdminStatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "default",
  className,
}: StatsCardProps) {
  return (
    <AdminCard variant="gradient" className={cn("relative overflow-hidden", className)}>
      {/* Background decoration */}
      <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold tracking-tight", colorClasses[color])}>
              {typeof value === "number" ? formatNumber(value) : value}
            </p>
          </div>
          {Icon && (
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconBgClasses[color])}>
              <Icon className={cn("h-6 w-6", colorClasses[color])} />
            </div>
          )}
        </div>
        
        {(description || trend) && (
          <div className="mt-4 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trend.isPositive
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : trend.value === 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {trend.value === 0 ? (
                  <Minus className="h-3 w-3" />
                ) : trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    </AdminCard>
  );
}

// Action Card - Card with action button
interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AdminActionCard({
  title,
  description,
  icon: Icon,
  action,
  color = "primary",
  className,
  children,
}: ActionCardProps) {
  return (
    <AdminCard interactive className={cn("group", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                `bg-${color}/10`
              )}
              style={{ backgroundColor: `oklch(var(--${color}) / 0.1)` }}
            >
              <Icon className={cn("h-5 w-5", `text-${color}`)} style={{ color: `oklch(var(--${color}))` }} />
            </div>
          )}
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-primary hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </AdminCard>
  );
}

// Grid Card - For dashboard grids
interface GridCardProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AdminGridCard({
  title,
  subtitle,
  extra,
  children,
  className,
  noPadding = false,
}: GridCardProps) {
  return (
    <AdminCard className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {extra}
      </div>
      <div className={cn("flex-1", !noPadding && "-mx-6")}>{children}</div>
    </AdminCard>
  );
}

export { cardVariants };
