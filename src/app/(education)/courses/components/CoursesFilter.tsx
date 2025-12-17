"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  GraduationCap,
  Beaker,
  Calculator,
  Globe,
  Palette,
  Music,
  type LucideIcon
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CoursesFilterProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: "newest" | "popular" | "rated" | "price-low" | "price-high";
  setSortBy: (sort: "newest" | "popular" | "rated" | "price-low" | "price-high") => void;
  levelFilter: string;
  setLevelFilter: (level: string) => void;
  resultsCount: number;
}

const iconMap: Record<string, LucideIcon> = {
  "📖": BookOpen,
  "🎓": GraduationCap,
  "🧪": Beaker,
  "🔢": Calculator,
  "🌍": Globe,
  "🎨": Palette,
  "🎵": Music,
  "default": BookOpen
};

const getIcon = (iconString: string) => {
  return iconMap[iconString] || iconMap.default;
};

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
  resultsCount
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { value: "newest", label: "الأحدث" },
    { value: "popular", label: "الأكثر شهرة" },
    { value: "rated", label: "الأعلى تقييماً" },
    { value: "price-low", label: "السعر: الأقل" },
    { value: "price-high", label: "السعر: الأعلى" }
  ];

  const levelOptions = [
    { value: "all", label: "جميع المستويات", color: "bg-slate-500" },
    { value: "BEGINNER", label: "مبتدئ", color: "bg-emerald-500" },
    { value: "INTERMEDIATE", label: "متوسط", color: "bg-amber-500" },
    { value: "ADVANCED", label: "متقدم", color: "bg-rose-500" }
  ];

  return (
    <div className="space-y-4">
      {/* Search and Toggle Filters Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center">
            <Search className="absolute right-4 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
            <input
              type="text"
              placeholder="ابحث عن دورة، مدرب، أو موضوع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
            />
            {searchTerm && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setSearchTerm("")}
                className="absolute left-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Filter Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border transition-all duration-300 ${
            showFilters 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-medium">الفلاتر</span>
          <motion.div
            animate={{ rotate: showFilters ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>الكل</span>
        </motion.button>
        
        {categories.map((category) => {
          const IconComponent = getIcon(category.icon);
          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeCategory === category.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300"
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{category.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  ترتيب حسب
                </label>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as typeof sortBy)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                        sortBy === option.value
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  المستوى
                </label>
                <div className="flex flex-wrap gap-2">
                  {levelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLevelFilter(option.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                        levelFilter === option.value
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex items-end">
                <div className="w-full p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800/30">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {resultsCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    دورة متاحة
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursesFilter;
