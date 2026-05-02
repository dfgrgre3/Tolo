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
        default: "",
        gradient: "bg-gradient-to-br from-card to-muted/50",
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
    <AdminCard 
      variant="glass" 
      className={cn(
        "relative overflow-hidden group",
        className
      )}
    >
      {/* Dynamic Glow Effect */}
      <div 
        className={cn(
          "absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-20",
          color === "blue" && "bg-blue-500",
          color === "green" && "bg-emerald-500",
          color === "yellow" && "bg-amber-500",
          color === "red" && "bg-red-500",
          color === "purple" && "bg-purple-500",
          color === "default" && "bg-primary"
        )} 
      />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</p>
            <div className="flex items-baseline gap-1">
              <p className={cn("text-4xl font-black tracking-tight drop-shadow-sm", colorClasses[color])}>
                {typeof value === "number" ? formatNumber(value) : value}
              </p>
            </div>
          </div>
          {Icon && (
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/10 shadow-lg", 
              iconBgClasses[color]
            )}>
              <Icon className={cn("h-7 w-7", colorClasses[color])} />
            </div>
          )}
        </div>
        
        {(description || trend) && (
          <div className="mt-6 flex items-center gap-3">
            {trend && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border",
                  trend.isPositive
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : trend.value === 0
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
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
              </div>
            )}
            {description && (
              <span className="text-[11px] font-bold text-muted-foreground/80 italic">{description}</span>
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

function AdminActionCard({
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
                "flex h-10 w-10 items-center justify-center rounded-xl",
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

;
