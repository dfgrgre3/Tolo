"use client";

import { m } from "framer-motion";
import { Search, Sparkles, Filter, SlidersHorizontal } from "lucide-react";
import { Category } from "./types";

interface LibraryFiltersProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: any) => void;
}

export function LibraryFilters({
  categories,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
}: LibraryFiltersProps) {
  return (
    <div className="space-y-10" dir="rtl">
      {/* Search Bar */}
      <div className="relative group max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-amber-500/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
        <div className="relative flex items-center">
          <Search className="absolute right-6 w-6 h-6 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="ابحث في أرشيف الحكمة عن الكتب، المذكرات، أو المؤلفين..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-20 bg-white/[0.03] border border-white/10 rounded-[2rem] pr-16 pl-8 text-xl font-bold text-white outline-none focus:border-amber-500/50 backdrop-blur-xl transition-all shadow-2xl"
          />
          <div className="absolute left-4 p-2 bg-white/5 rounded-2xl border border-white/10 text-gray-500 group-focus-within:text-amber-500 transition-colors">
            <Filter className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Categories & Sorting */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Categories Carousel-like list */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 px-2 no-scrollbar w-full lg:w-auto">
          <button
            onClick={() => onCategoryChange("all")}
            className={`h-14 px-8 rounded-2xl flex items-center gap-3 transition-all font-black text-sm whitespace-nowrap border ${
              activeCategory === "all"
                ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>كل الرفوف</span>
          </button>
          
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`h-14 px-8 rounded-2xl flex items-center gap-3 transition-all font-black text-sm whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
          <div className="p-2 bg-white/5 rounded-xl text-gray-500">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="flex gap-2">
            {[
              { id: "newest", label: "الأحدث" },
              { id: "popular", label: "الأكثر تداولاً" },
              { id: "rated", label: "الأعلى رتبة" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onSortChange(s.id)}
                className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  sortBy === s.id
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
