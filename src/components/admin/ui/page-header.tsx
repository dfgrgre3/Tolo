"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  badge?: string;
  eyebrow?: string;
  meta?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  badge,
  eyebrow,
  meta,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 px-5 py-5 shadow-sm backdrop-blur-xl sm:px-6 sm:py-6",
        className
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          {eyebrow && (
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          )}
          {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 lg:max-w-[45%] lg:justify-end">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
