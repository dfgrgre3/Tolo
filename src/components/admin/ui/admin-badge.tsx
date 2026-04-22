"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border bg-transparent",
        solid: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
      status: {
        success: "bg-green-500/10 text-green-600 border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
        error: "bg-red-500/10 text-red-600 border-red-500/20",
        info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    compoundVariants: [
      {
        variant: "outline",
        status: "success",
        class: "border-green-500/30",
      },
      {
        variant: "outline",
        status: "warning",
        class: "border-yellow-500/30",
      },
      {
        variant: "outline",
        status: "error",
        class: "border-red-500/30",
      },
      {
        variant: "outline",
        status: "info",
        class: "border-blue-500/30",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface AdminBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ElementType;
  dot?: boolean;
  pulse?: boolean;
}

export function AdminBadge({
  className,
  variant,
  size,
  status,
  icon: Icon,
  dot,
  pulse,
  children,
  ...props
}: AdminBadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ variant, size, status }),
        variant === "outline" && status && "border",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "success" && "bg-green-500",
            status === "warning" && "bg-yellow-500",
            status === "error" && "bg-red-500",
            status === "info" && "bg-blue-500",
            !status && "bg-current",
            pulse && "animate-pulse"
          )}
        />
      )}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

// Status Badge with predefined styles
interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "suspended" | "verified" | "unverified";
  className?: string;
}

const statusConfig: Record<StatusBadgeProps["status"], { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> = {
  active: { label: "نشط", variant: "success" },
  inactive: { label: "غير نشط", variant: "neutral" },
  pending: { label: "قيد الانتظار", variant: "warning" },
  suspended: { label: "معلق", variant: "error" },
  verified: { label: "موثق", variant: "success" },
  unverified: { label: "غير موثق", variant: "warning" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <AdminBadge
      variant="outline"
      status={config.variant}
      dot
      className={className}
    >
      {config.label}
    </AdminBadge>
  );
}

// Role Badge
interface RoleBadgeProps {
  role: "ADMIN" | "TEACHER" | "STUDENT" | "MODERATOR" | "USER";
  className?: string;
}

const roleConfig: Record<RoleBadgeProps["role"], { label: string; color: string; bg: string }> = {
  ADMIN: { label: "مدير", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20" },
  TEACHER: { label: "معلم", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20" },
  STUDENT: { label: "طالب", color: "text-green-600", bg: "bg-green-500/10 border-green-500/20" },
  MODERATOR: { label: "مشرف", color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/20" },
  USER: { label: "مستخدم", color: "text-gray-600", bg: "bg-gray-500/10 border-gray-500/20" },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
        config.color,
        config.bg,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Count Badge - for notifications/counts
interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
  pulse?: boolean;
}

export function CountBadge({ count, max = 99, className, pulse }: CountBadgeProps) {
  if (count === 0) return null;
  
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground",
        pulse && "animate-pulse",
        className
      )}
    >
      {displayCount}
    </span>
  );
}

export { badgeVariants };
