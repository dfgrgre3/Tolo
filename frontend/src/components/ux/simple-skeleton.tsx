"use client";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

/** هيكل تحميل خفيف بدون أي أنيميشن — لتقليل التشتت وتحسين الأداء */
export function SimpleSkeleton({ className, label = "جاري تحميل المحتوى…" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60", className)}
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

/** زر رئيسي كبير وواضح بخطوة واحدة */
export function primaryActionClass(extra?: string) {
  return cn("min-h-[52px] w-full rounded-2xl px-6 text-base font-extrabold sm:w-auto", extra);
}
