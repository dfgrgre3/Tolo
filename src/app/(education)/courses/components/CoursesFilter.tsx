"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Beaker,
  BookOpen,
  Calculator,
  ChevronDown,
  Code2,
  Globe,
  Landmark,
  Languages,
  Search,

  Sparkles,
  X,
  type LucideIcon,
  Clock,
  TrendingUp,
  Star,
  Filter,
  RotateCcw } from
"lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

type SortOption = "newest" | "popular" | "rated" | "price-low" | "price-high" | "duration-short" | "duration-long";
type CourseLevelFilter = "all" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

interface CoursesFilterProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  levelFilter: CourseLevelFilter;
  setLevelFilter: (level: CourseLevelFilter) => void;
  resultsCount: number;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

const categoryIconsById: Record<string, LucideIcon> = {
  MATH: Calculator,
  PHYSICS: Beaker,
  CHEMISTRY: Beaker,
  BIOLOGY: Beaker,
  ARABIC: Languages,
  ENGLISH: Languages,
  HISTORY: Landmark,
  GEOGRAPHY: Globe,
  PROGRAMMING: Code2,
  COMPUTER_SCIENCE: Code2
};

function resolveCategoryIcon(category: Category): LucideIcon {
  const byId = categoryIconsById[category.id];
  if (byId) return byId;
  if (category.icon?.includes("ًں§ھ") || category.icon?.includes("âڑ›")) return Beaker;
  if (category.icon?.includes("ًںŒچ")) return Globe;
  if (category.icon?.includes("ًں”¢")) return Calculator;
  if (category.icon?.includes("ًں’»") || category.icon?.includes("ًں–¥")) return Code2;
  if (category.icon?.includes("ًںڈ›")) return Landmark;
  return BookOpen;
}

export const CoursesFilter: React.FC<CoursesFilterProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  levelFilter,
  setLevelFilter,
  resultsCount,
  hasActiveFilters = false,
  onResetFilters
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = useMemo(
    () => [
    { value: "newest", label: "الأحدث", icon: TrendingUp },
    { value: "popular", label: "الأكثر طلبًا", icon: TrendingUp },
    { value: "rated", label: "الأعلى تقييمًا", icon: Star },
    { value: "price-low", label: "السعر: الأقل", icon: null },
    { value: "price-high", label: "السعر: الأعلى", icon: null },
    { value: "duration-short", label: "المدة: الأقصر", icon: Clock },
    { value: "duration-long", label: "المدة: الأطول", icon: Clock }],

    []
  );

  const levelOptions = useMemo(
    () => [
    { value: "all", label: "كل المستويات", color: "bg-gray-400" },
    { value: "BEGINNER", label: "مبتدئ", color: "bg-emerald-500" },
    { value: "INTERMEDIATE", label: "متوسط", color: "bg-amber-500" },
    { value: "ADVANCED", label: "متقدم", color: "bg-rose-500" }],

    []
  );

  return (
    <section className="space-y-4">
      {/* Search + Filter Toggle row */}
      <div className="flex flex-col gap-3 md:flex-row">
        {/* Search input */}
        <div className="group relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="ابحث عن دورة، مدرس، أو مهارة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full rounded-xl border bg-white py-3 pl-10 pr-11 text-sm transition-all duration-200",
              "border-gray-200 text-gray-900 placeholder:text-gray-400",
              "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10",
              "dark:border-white/10 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500",
              "dark:focus:border-primary/40 dark:focus:ring-primary/5"
            )} />
          
          {searchTerm.trim() !== "" &&
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSearchTerm("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
            
              <X className="h-4 w-4" />
            </motion.button>
          }
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all duration-200",
            showFilters ?
            "border-primary bg-primary text-white" :
            "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:border-white/20"
          )}>
          
          <Filter className="h-4 w-4" />
          <span>الفلاتر</span>
          {hasActiveFilters &&
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
              âœ“
            </span>
          }
          <motion.div animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </button>

        {/* Reset filters */}
        {hasActiveFilters && onResetFilters &&
        <button
          onClick={onResetFilters}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-500 transition-all hover:border-red-200 hover:text-red-500 dark:border-white/10 dark:bg-gray-900/80 dark:text-gray-400">
          
            <RotateCcw className="h-4 w-4" />
            <span>إعادة ضبط</span>
          </button>
        }
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
            activeCategory === "all" ?
            "bg-primary text-white shadow-md shadow-primary/20" :
            "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:border-white/20"
          )}>
          
          <Sparkles className="h-3.5 w-3.5" />
          <span>الكل</span>
        </button>

        {categories.map((category) => {
          const IconComponent = resolveCategoryIcon(category);
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
                isActive ?
                "bg-primary text-white shadow-md shadow-primary/20" :
                "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:border-white/20"
              )}>
              
              <IconComponent className="h-3.5 w-3.5" />
              <span>{category.name}</span>
              {typeof category.count === "number" &&
              <span
                className={cn(
                  "rounded-lg px-1.5 py-0.5 text-[10px] font-bold",
                  isActive ?
                  "bg-white/20 text-white" :
                  "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                )}>
                
                  {category.count}
                </span>
              }
            </button>);

        })}
      </div>

      {/* Expanded filter panel */}
      <AnimatePresence>
        {showFilters &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden">
          
            <div className="grid grid-cols-1 gap-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 p-6 md:grid-cols-3">
              {/* Sort options */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">ترتيب حسب</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) =>
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortOption)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    sortBy === option.value ?
                    "bg-primary text-white shadow-sm" :
                    "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  )}>
                  
                      {option.label}
                    </button>
                )}
                </div>
              </div>

              {/* Level filter */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">مستوى الصعوبة</p>
                <div className="flex flex-wrap gap-2">
                  {levelOptions.map((option) =>
                <button
                  key={option.value}
                  onClick={() => setLevelFilter(option.value as CourseLevelFilter)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    levelFilter === option.value ?
                    "bg-primary text-white shadow-sm" :
                    "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  )}>
                  
                      <span className={cn("h-2 w-2 rounded-full", option.color)} />
                      {option.label}
                    </button>
                )}
                </div>
              </div>

              {/* Results counter */}
              <div className="flex flex-col justify-between gap-3">
                <div className="rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10 p-4 text-center">
                  <p className="text-3xl font-black text-primary" suppressHydrationWarning>{resultsCount}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">دورة مطابقة</p>
                </div>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </section>);

};

export default CoursesFilter;