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
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon,
  Clock,
  TrendingUp,
  Star
} from "lucide-react";

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
  COMPUTER_SCIENCE: Code2,
};

function resolveCategoryIcon(category: Category): LucideIcon {
  const byId = categoryIconsById[category.id];
  if (byId) {
    return byId;
  }

  if (category.icon?.includes("🧪") || category.icon?.includes("⚛")) {
    return Beaker;
  }

  if (category.icon?.includes("🌍")) {
    return Globe;
  }

  if (category.icon?.includes("🔢")) {
    return Calculator;
  }

  if (category.icon?.includes("💻") || category.icon?.includes("🖥")) {
    return Code2;
  }

  if (category.icon?.includes("🏛")) {
    return Landmark;
  }

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
  onResetFilters,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = useMemo(
    () => [
      { value: "newest", label: "الأحدث" },
      { value: "popular", label: "الأكثر طلبًا" },
      { value: "rated", label: "الأعلى تقييمًا" },
      { value: "price-low", label: "السعر: الأقل" },
      { value: "price-high", label: "السعر: الأعلى" },
      { value: "duration-short", label: "المدة: الأقصر" },
      { value: "duration-long", label: "المدة: الأطول" },
    ],
    []
  );

  const levelOptions = useMemo(
    () => [
      { value: "all", label: "كل المستويات", color: "bg-slate-500" },
      { value: "BEGINNER", label: "مبتدئ", color: "bg-emerald-500" },
      { value: "INTERMEDIATE", label: "متوسط", color: "bg-amber-500" },
      { value: "ADVANCED", label: "متقدم", color: "bg-rose-500" },
    ],
    []
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="group relative flex-1">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-100" />
          <div className="relative flex items-center">
            <Search className="absolute right-4 h-5 w-5 text-slate-400 transition-colors duration-300 group-focus-within:text-blue-500" />
            <input
              type="text"
              placeholder="ابحث عن دورة أو مدرس أو مهارة..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-12 pr-12 text-slate-900 backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
            />
            {searchTerm.trim() !== "" && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchTerm("")}
                className="absolute left-4 rounded-full p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4 text-slate-400" />
              </motion.button>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFilters((prev) => !prev)}
          className={`flex items-center gap-2 rounded-2xl border px-5 py-3.5 transition-all duration-300 ${
            showFilters
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-medium">الفلاتر</span>
          <motion.div animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20"
              : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>الكل</span>
        </motion.button>

        {categories.map((category) => {
          const IconComponent = resolveCategoryIcon(category);
          const isActive = activeCategory === category.id;

          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{category.name}</span>
              {typeof category.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {category.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">ترتيب النتائج</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as SortOption)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        sortBy === option.value
                          ? "bg-blue-500 text-white flex items-center gap-1"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 flex items-center gap-1"
                      }`}
                    >
                      {option.value.includes('newest') && <TrendingUp className="h-3 w-3" />}
                      {option.value.includes('popular') && <TrendingUp className="h-3 w-3" />}
                      {option.value.includes('rated') && <Star className="h-3 w-3" />}
                      {option.value.includes('duration') && <Clock className="h-3 w-3" />}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">مستوى الدورة</p>
                <div className="flex flex-wrap gap-2">
                  {levelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLevelFilter(option.value as CourseLevelFilter)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        levelFilter === option.value
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${option.color}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3">
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800/30 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resultsCount}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">دورة مطابقة</p>
                </div>

                {hasActiveFilters && onResetFilters && (
                  <button
                    onClick={onResetFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CoursesFilter;
