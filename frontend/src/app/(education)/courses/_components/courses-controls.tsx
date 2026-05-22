"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, LEVEL_OPTIONS } from "./constants";
import type { CourseLevel, SortOption } from "./types";

type ControlLevel = "ALL" | CourseLevel;

export function CoursesControls({
  sortBy,
  onSortChange,
  selectedLevel,
  onLevelChange,
  hasActiveFilters,
  onReset,
}: {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  selectedLevel: ControlLevel;
  onLevelChange: (value: ControlLevel) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <section className="mt-10 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="rounded-[24px] bg-slate-50 p-4 dark:bg-white/5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="h-4 w-4" />
            إعدادات العرض
          </div>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            خصّص النتائج حسب المستوى والسعر والشهرة للوصول إلى الدورة الأنسب أسرع.
          </p>
        </div>

        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="h-14 min-w-[190px] rounded-2xl border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedLevel}
          onValueChange={(value) => onLevelChange(value as ControlLevel)}
        >
          <SelectTrigger className="h-14 min-w-[180px] rounded-2xl border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <SelectValue placeholder="المستوى" />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          disabled={!hasActiveFilters}
          className="h-14 rounded-2xl border-slate-200 px-6 dark:border-white/10"
          onClick={onReset}
        >
          إعادة الضبط
        </Button>
      </div>
    </section>
  );
}
